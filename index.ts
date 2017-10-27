import { FunQ } from 'fun-q'
import { debounce, getIfNot, throttle } from 'illa/FunctionUtil'
import { assign, findObject } from 'illa/ObjectUtil'
import { isUndefined } from 'illa/Type'

export interface IRequestableResponseData<T> {
	response: T
}

export interface IRequestableAbortable {
	abort(): void
}

export enum RequestableDelayLoadType {
	THROTTLE,
	DEBOUNCE,
}

export interface IRequestableSchema<DataType, RequestType = any, ResponseType = any> {
	name?: string
	value?: DataType
	lastRequest?: RequestType
	lastResponse?: ResponseType
	lastError?: string
	lastLoaded?: number
	renderCount?: number
	expiresAfterMs?: number
	delayLoadMs?: number
	delayLoadType?: RequestableDelayLoadType
	catchErrors?: boolean
}

export abstract class Requestable<DataType, RequestType = any, ResponseType = any> {

	private name?: string
	private value?: DataType
	private lastRequest?: RequestType
	private lastResponse?: ResponseType
	private lastError?: any
	private lastLoaded?: number
	private renderCount: number = 0
	private abortable?: IRequestableAbortable
	private expiresAfterMs: number = 1000
	private delayLoadMs: number = 0
	private delayLoadType?: RequestableDelayLoadType = RequestableDelayLoadType.DEBOUNCE
	private catchErrors?: boolean

	private delayedLoad?: {
		(a: (abortable: IRequestableAbortable) => any, b: RequestType): FunQ<{ value: FunQ<IRequestableResponseData<ResponseType>> }>;
		callNow(a: (abortable: IRequestableAbortable) => any, b: RequestType): FunQ<IRequestableResponseData<ResponseType>>;
		cancel(): void;
		lastCalled: number;
		timeoutRef: any;
		isScheduled(): boolean;
	}

	constructor(_?: IRequestableSchema<DataType, RequestType, ResponseType>) {
		if (_) assign(this, _)
		if (this.log) this.log('constructor', _)
	}

	get() {
		return this.value
	}

	setValueAndMeta(value: DataType | undefined, _: { lastRequest?: RequestType, lastResponse?: ResponseType, lastError?: any, lastLoaded?: number } = {}) {
		if (this.log) this.log('setValueAndMeta', value, _)
		this.abort()
		this.detachValue()
		this.value = value
		this.lastError = _.lastError
		this.lastRequest = _.lastRequest
		this.lastResponse = _.lastResponse
		this.lastLoaded = _.lastLoaded

		return this
	}

	onRender() {
		this.renderCount++
		if (this.log) this.log('onRender', this.renderCount)
	}

	onUnrender() {
		this.renderCount--
		if (this.log) this.log('onUnrender', this.renderCount)
	}

	abstract getter(response: ResponseType): DataType

	abstract getDefaultRequest(): RequestType

	load<T extends {} = {}>(_: { request?: RequestType, noReset?: boolean, immediately?: boolean } = {}): FunQ<T> {
		let request = _.request || this.getDefaultRequest()
		if (!request) throw new Error('[owmzz8] No request.')
		if (this.log) this.log('load', request, _)
		if (_.noReset) {
			this.abort()
		} else {
			this.reset()
		}
		this.lastRequest = request
		if (!this.delayedLoad) {
			switch (this.delayLoadType) {
				case RequestableDelayLoadType.THROTTLE:
					this.delayedLoad = throttle(this.loadInternal, this, this.delayLoadMs)
					break
				case RequestableDelayLoadType.DEBOUNCE:
				default:
					this.delayedLoad = debounce(this.loadInternal, this, this.delayLoadMs)
					break
			}
		}
		let abortableSetter = (abortable: IRequestableAbortable) => {
			if (this.log) this.log('abortableSetter', abortable)
			this.abortable = abortable
			if (!_.immediately && this.delayLoadMs) {
				this.onDelayedAbortable()
			}
		}
		let resolveResponse: () => void
		let rejectResponse: (e?: any) => void
		return (
			new FunQ<T & { value?: DataType }>()
				.onSuccessAwait((q) => {
					if (this.log) this.log('valueQ.onSuccessAwait', q.data)
					let delayedQ: FunQ<{ value: FunQ<IRequestableResponseData<ResponseType>> }>
					if (_.immediately) {
						delayedQ = new FunQ<{ value: FunQ<IRequestableResponseData<ResponseType>> }>()
							.onSuccess((q) => q.data.value = this.delayedLoad!.callNow(abortableSetter, request))
					} else {
						delayedQ = this.delayedLoad!(abortableSetter, request)
					}
					delayedQ
						.onDone((delayError, delayedQGuts) => {
							if (this.log) this.log('delayedQ.onValue')
							if (delayError) {
								q.reject(delayError)
							} else {
								delayedQGuts.data.value
									.onDoneAwait((responseError, responseQ) => {
										if (this.log) this.log('responseQ.onDoneAwait', responseError, responseQ.data.response)
										resolveResponse = responseQ.resolve
										rejectResponse = responseQ.reject

										this.abortable = undefined
										this.lastResponse = responseQ.data.response
										this.lastLoaded = Date.now()

										if (responseError) {
											q.reject(responseError)
										} else {
											try {
												this.value = q.data.value = this.getter(responseQ.data.response)
												q.resolve()
											} catch (valueError) {
												q.reject(valueError)
											}
										}
									})
							}
						})
				})
				.onDone((e, q) => {
					if (this.log) this.log('valueQ.onFinished', e, q)
					this.lastError = e

					if (e) {
						throw e
					}
				})
				.onFinished((e, q) => {
					this.lastError = e
					
					if (this.catchErrors) {
						resolveResponse()
					} else {
						if (e) {
							if (rejectResponse) rejectResponse(e)
							else console.error(e)
						} else {
							resolveResponse()
						}
					}
				})
		)
	}

	protected abstract loadInternal(
		abortableSetter: (abortable: IRequestableAbortable) => any,
		request: RequestType,
	): FunQ<IRequestableResponseData<ResponseType>>

	protected onDelayedAbortable(): void { }

	abort() {
		if (this.delayedLoad) {
			if (this.log) this.log('delayedLoad.cancel()')
			this.delayedLoad.cancel()
		}
		if (this.abortable) {
			if (this.log) this.log('abortable.abort()')
			this.abortable.abort()
			this.abortable = undefined
		}
		return this
	}

	reset() {
		this.setValueAndMeta(undefined)
		return this
	}

	protected detachValue(_: { noRecurse?: boolean } = {}) {
		if (!_.noRecurse && this.value) {
			findObject<Requestable<any>>(this.value, o => o instanceof Requestable).forEach(r => r.detach({ noRecurse: true }))
		}
	}

	detach(_: { noRecurse?: boolean } = {}) {
		this.abort()
		this.detachValue({ noRecurse: _.noRecurse })
	}

	isLoading() {
		return !!this.abortable
	}

	isScheduled() {
		return !!this.delayedLoad && this.delayedLoad.isScheduled()
	}

	hasExpired() {
		return !this.isLoading() && !this.isScheduled() && getIfNot(isNaN, this.lastLoaded, -Infinity)! + this.expiresAfterMs < Date.now()
	}

	isDefined() {
		return !isUndefined(this.get())
	}

	isHiddenAndExpired() {
		return this.isHidden() && this.hasExpired()
	}

	isHidden() {
		return this.renderCount <= 0
	}

	hasError() {
		return !!this.lastError
	}

	getLastRequest() {
		return this.lastRequest
	}

	getLastResponse() {
		return this.lastResponse
	}

	getLastErrorAsString() {
		if (Array.isArray(this.lastError)) {
			return this.lastError.join(`\n`)
		} else {
			return this.lastError ? this.lastError + '' : undefined
		}
	}

	getLastError() {
		return this.lastError
	}

	getLastLoaded() {
		return this.lastLoaded
	}

	getRenderCount() {
		return this.renderCount
	}
	
	getName() {
		return this.name
	}

	protected log: (...rest: any[]) => void
	// protected log(...rest: any[]) {
	// 	if (this.name) console.log(`[owy2tj] ${this.name}:`, ...rest)
	// }
}