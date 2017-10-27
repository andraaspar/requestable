import { Requestable, IRequestableAbortable, IRequestableResponseData, IRequestableSchema } from './index'
import { FunQ } from 'fun-q'

class R<T, Q, S> extends Requestable<T, Q, S> {
	constructor(protected o: {
		getter: (response: S) => T
		request: Q
		response: S
	} & IRequestableSchema<T, Q, S>) {
		super(o)
	}
	getter(response: S): T {
		return this.o.getter(response)
	}
	getDefaultRequest(): Q {
		return this.o.request
	}
	protected loadInternal(abortableSetter: (abortable: IRequestableAbortable) => void, request: Q): FunQ<IRequestableResponseData<S>> {
		abortableSetter({ abort: () => { } })
		return new FunQ<IRequestableResponseData<S>>()
			.onSuccess(q => {
				q.data.response = this.o.response
			})
	}
}

class RDelayed<T, Q, S> extends R<T, Q, S> {
	protected loadInternal(abortableSetter: (abortable: IRequestableAbortable) => void, request: Q): FunQ<IRequestableResponseData<S>> {
		let isAborted = false
		abortableSetter({
			abort: () => {
				isAborted = true
			}
		})
		return super.loadInternal(abortableSetter, request)
			.afterSuccessAwait(q => {
				if (!isAborted) {
					q.resolve()
				}
			})
	}
}

class RFails<T, Q, S> extends R<T, Q, S> {
	protected loadInternal(abortableSetter: (abortable: IRequestableAbortable) => void, request: Q): FunQ<IRequestableResponseData<S>> {
		abortableSetter({ abort: () => { } })
		return new FunQ<IRequestableResponseData<S>>()
			.onSuccess(q => {
				throw { toString: () => 'error' }
			})
	}
}

describe('Requestable', () => {
	describe('Default state', () => {
		let r: R<number, {}, { value: number }>
		beforeEach(() => {
			r = new R({
				request: {},
				response: { value: 42 },
				getter: r => r.value,
			})
		})
		it('Has no value.', () => {
			expect(r.get()).toBeUndefined()
		})
		it('Has no last error.', () => {
			expect(r.getLastError()).toBeUndefined()
		})
		it('Has no last error string.', () => {
			expect(r.getLastErrorAsString()).toBeUndefined()
		})
		it('Has no last loaded timestamp.', () => {
			expect(r.getLastLoaded()).toBeUndefined()
		})
		it('Has no last request.', () => {
			expect(r.getLastRequest()).toBeUndefined()
		})
		it('Has no last response.', () => {
			expect(r.getLastResponse()).toBeUndefined()
		})
		it('Has render count 0.', () => {
			expect(r.getRenderCount()).toBe(0)
		})
		it('Has no error.', () => {
			expect(r.hasError()).toBe(false)
		})
		it('Has expired.', () => {
			expect(r.hasExpired()).toBe(true)
		})
		it('Is not defined.', () => {
			expect(r.isDefined()).toBe(false)
		})
		it('Is not loading.', () => {
			expect(r.isLoading()).toBe(false)
		})
		it('Is hidden.', () => {
			expect(r.isHidden()).toBe(true)
		})
		it('Is not scheduled.', () => {
			expect(r.isScheduled()).toBe(false)
		})
		it('Is hidden and expired.', () => {
			expect(r.isHiddenAndExpired()).toBe(true)
		})
	})
	describe('Loaded state', () => {
		let r: R<number, {}, { value: number }>
		beforeEach(() => {
			r = new R({
				request: {},
				response: { value: 42 },
				getter: r => r.value,
			})
			r.load()
		})
		it('Has result.', () => {
			expect(r.get()).toBe(42)
		})
		it('Has no last error.', () => {
			expect(r.getLastError()).toBeUndefined()
		})
		it('Has no last error string.', () => {
			expect(r.getLastErrorAsString()).toBeUndefined()
		})
		it('Has last loaded timestamp.', () => {
			expect(r.getLastLoaded()).toBeGreaterThan(Date.now() - 1000)
		})
		it('Has last request.', () => {
			expect(r.getLastRequest()).toEqual({})
		})
		it('Has last response.', () => {
			expect(r.getLastResponse()).toEqual({ value: 42 })
		})
		it('Has render count 0.', () => {
			expect(r.getRenderCount()).toBe(0)
		})
		it('Has no error.', () => {
			expect(r.hasError()).toBe(false)
		})
		it('Has not expired.', () => {
			expect(r.hasExpired()).toBe(false)
		})
		it('Is defined.', () => {
			expect(r.isDefined()).toBe(true)
		})
		it('Is not loading.', () => {
			expect(r.isLoading()).toBe(false)
		})
		it('Is hidden.', () => {
			expect(r.isHidden()).toBe(true)
		})
		it('Is not scheduled.', () => {
			expect(r.isScheduled()).toBe(false)
		})
		it('Is not hidden and expired.', () => {
			expect(r.isHiddenAndExpired()).toBe(false)
		})
	})
	describe('Loading state', () => {
		let r: R<number, {}, { value: number }>
		beforeEach(() => {
			r = new RDelayed({
				request: {},
				response: { value: 42 },
				getter: r => r.value,
			})
			r.load()
		})
		it('Has no value.', () => {
			expect(r.get()).toBeUndefined()
		})
		it('Has no last error.', () => {
			expect(r.getLastError()).toBeUndefined()
		})
		it('Has no last error string.', () => {
			expect(r.getLastErrorAsString()).toBeUndefined()
		})
		it('Has no last loaded timestamp.', () => {
			expect(r.getLastLoaded()).toBeUndefined()
		})
		it('Has last request.', () => {
			expect(r.getLastRequest()).toEqual({})
		})
		it('Has no last response.', () => {
			expect(r.getLastResponse()).toBeUndefined()
		})
		it('Has render count 0.', () => {
			expect(r.getRenderCount()).toBe(0)
		})
		it('Has no error.', () => {
			expect(r.hasError()).toBe(false)
		})
		it('Has not expired.', () => {
			expect(r.hasExpired()).toBe(false)
		})
		it('Is not defined.', () => {
			expect(r.isDefined()).toBe(false)
		})
		it('Is loading.', () => {
			expect(r.isLoading()).toBe(true)
		})
		it('Is hidden.', () => {
			expect(r.isHidden()).toBe(true)
		})
		it('Is not scheduled.', () => {
			expect(r.isScheduled()).toBe(false)
		})
		it('Is not hidden and expired.', () => {
			expect(r.isHiddenAndExpired()).toBe(false)
		})
	})
	describe('Loading again state', () => {
		let r: R<number, {}, { value: number }>
		beforeEach((done) => {
			r = new RDelayed({
				request: {},
				response: { value: 42 },
				getter: r => r.value,
			})
			r.load()
				.afterSuccess(q => {
					r.load()
					done()
				})
		})
		it('Has no value.', () => {
			expect(r.get()).toBeUndefined()
		})
		it('Has no last error.', () => {
			expect(r.getLastError()).toBeUndefined()
		})
		it('Has no last error string.', () => {
			expect(r.getLastErrorAsString()).toBeUndefined()
		})
		it('Has no last loaded timestamp.', () => {
			expect(r.getLastLoaded()).toBeUndefined()
		})
		it('Has last request.', () => {
			expect(r.getLastRequest()).toEqual({})
		})
		it('Has no last response.', () => {
			expect(r.getLastResponse()).toBeUndefined()
		})
		it('Has render count 0.', () => {
			expect(r.getRenderCount()).toBe(0)
		})
		it('Has no error.', () => {
			expect(r.hasError()).toBe(false)
		})
		it('Has not expired.', () => {
			expect(r.hasExpired()).toBe(false)
		})
		it('Is not defined.', () => {
			expect(r.isDefined()).toBe(false)
		})
		it('Is loading.', () => {
			expect(r.isLoading()).toBe(true)
		})
		it('Is hidden.', () => {
			expect(r.isHidden()).toBe(true)
		})
		it('Is not scheduled.', () => {
			expect(r.isScheduled()).toBe(false)
		})
		it('Is not hidden and expired.', () => {
			expect(r.isHiddenAndExpired()).toBe(false)
		})
	})
	describe('Aborted state', () => {
		let r: R<number, {}, { value: number }>
		beforeEach(() => {
			r = new RDelayed({
				request: {},
				response: { value: 42 },
				getter: r => r.value,
			})
			r.load()
			r.abort()
		})
		it('Has no value.', () => {
			expect(r.get()).toBeUndefined()
		})
		it('Has no last error.', () => {
			expect(r.getLastError()).toBeUndefined()
		})
		it('Has no last error string.', () => {
			expect(r.getLastErrorAsString()).toBeUndefined()
		})
		it('Has no last loaded timestamp.', () => {
			expect(r.getLastLoaded()).toBeUndefined()
		})
		it('Has no last request.', () => {
			expect(r.getLastRequest()).toEqual({})
		})
		it('Has no last response.', () => {
			expect(r.getLastResponse()).toBeUndefined()
		})
		it('Has render count 0.', () => {
			expect(r.getRenderCount()).toBe(0)
		})
		it('Has no error.', () => {
			expect(r.hasError()).toBe(false)
		})
		it('Has expired.', () => {
			expect(r.hasExpired()).toBe(true)
		})
		it('Is not defined.', () => {
			expect(r.isDefined()).toBe(false)
		})
		it('Is not loading.', () => {
			expect(r.isLoading()).toBe(false)
		})
		it('Is hidden.', () => {
			expect(r.isHidden()).toBe(true)
		})
		it('Is not scheduled.', () => {
			expect(r.isScheduled()).toBe(false)
		})
		it('Is hidden and expired.', () => {
			expect(r.isHiddenAndExpired()).toBe(true)
		})
	})
	describe('Error state', () => {
		let r: R<number, {}, { value: number }>
		beforeEach((done) => {
			r = new RFails({
				request: {},
				response: { value: 42 },
				getter: r => r.value,
			})
			r.load()
				.onDone(done)
		})
		it('Has no result.', () => {
			expect(r.get()).toBeUndefined()
		})
		it('Has last error.', () => {
			expect(r.getLastError()).toBeDefined()
		})
		it('Has last error string.', () => {
			expect(r.getLastErrorAsString()).toBe('error')
		})
		it('Has no last loaded timestamp.', () => {
			expect(r.getLastLoaded()).toBeGreaterThan(Date.now() - 1000)
		})
		it('Has last request.', () => {
			expect(r.getLastRequest()).toEqual({})
		})
		it('Has no last response.', () => {
			expect(r.getLastResponse()).toBeUndefined()
		})
		it('Has render count 0.', () => {
			expect(r.getRenderCount()).toBe(0)
		})
		it('Has error.', () => {
			expect(r.hasError()).toBe(true)
		})
		it('Has not expired.', () => {
			expect(r.hasExpired()).toBe(false)
		})
		it('Is not defined.', () => {
			expect(r.isDefined()).toBe(false)
		})
		it('Is not loading.', () => {
			expect(r.isLoading()).toBe(false)
		})
		it('Is hidden.', () => {
			expect(r.isHidden()).toBe(true)
		})
		it('Is not scheduled.', () => {
			expect(r.isScheduled()).toBe(false)
		})
		it('Is not hidden and expired.', () => {
			expect(r.isHiddenAndExpired()).toBe(false)
		})
	})
	describe('Expired state', () => {
		let r: R<number, {}, { value: number }>
		beforeEach((done) => {
			r = new R({
				request: {},
				response: { value: 42 },
				getter: r => r.value,
				expiresAfterMs: 0,
			})
			r.load()
				.afterSuccess(done)
		})
		it('Has result.', () => {
			expect(r.get()).toBe(42)
		})
		it('Has no last error.', () => {
			expect(r.getLastError()).toBeUndefined()
		})
		it('Has no last error string.', () => {
			expect(r.getLastErrorAsString()).toBeUndefined()
		})
		it('Has last loaded timestamp.', () => {
			expect(r.getLastLoaded()).toBeGreaterThan(Date.now() - 1000)
		})
		it('Has last request.', () => {
			expect(r.getLastRequest()).toEqual({})
		})
		it('Has last response.', () => {
			expect(r.getLastResponse()).toEqual({ value: 42 })
		})
		it('Has render count 0.', () => {
			expect(r.getRenderCount()).toBe(0)
		})
		it('Has no error.', () => {
			expect(r.hasError()).toBe(false)
		})
		it('Has expired.', () => {
			expect(r.hasExpired()).toBe(true)
		})
		it('Is defined.', () => {
			expect(r.isDefined()).toBe(true)
		})
		it('Is not loading.', () => {
			expect(r.isLoading()).toBe(false)
		})
		it('Is hidden.', () => {
			expect(r.isHidden()).toBe(true)
		})
		it('Is not scheduled.', () => {
			expect(r.isScheduled()).toBe(false)
		})
		it('Is hidden and expired.', () => {
			expect(r.isHiddenAndExpired()).toBe(true)
		})
	})
	describe('Debounced state', () => {
		let r: R<number, {}, { value: number }>
		beforeEach(() => {
			r = new R({
				request: {},
				response: { value: 42 },
				getter: r => r.value,
				delayLoadMs: 10,
			})
			r.load()
		})
		it('Has no value.', () => {
			expect(r.get()).toBeUndefined()
		})
		it('Has no last error.', () => {
			expect(r.getLastError()).toBeUndefined()
		})
		it('Has no last error string.', () => {
			expect(r.getLastErrorAsString()).toBeUndefined()
		})
		it('Has no last loaded timestamp.', () => {
			expect(r.getLastLoaded()).toBeUndefined()
		})
		it('Has last request.', () => {
			expect(r.getLastRequest()).toEqual({})
		})
		it('Has no last response.', () => {
			expect(r.getLastResponse()).toBeUndefined()
		})
		it('Has render count 0.', () => {
			expect(r.getRenderCount()).toBe(0)
		})
		it('Has no error.', () => {
			expect(r.hasError()).toBe(false)
		})
		it('Has not expired.', () => {
			expect(r.hasExpired()).toBe(false)
		})
		it('Is not defined.', () => {
			expect(r.isDefined()).toBe(false)
		})
		it('Is not loading.', () => {
			expect(r.isLoading()).toBe(false)
		})
		it('Is hidden.', () => {
			expect(r.isHidden()).toBe(true)
		})
		it('Is scheduled.', () => {
			expect(r.isScheduled()).toBe(true)
		})
		it('Is not hidden and expired.', () => {
			expect(r.isHiddenAndExpired()).toBe(false)
		})
	})
})