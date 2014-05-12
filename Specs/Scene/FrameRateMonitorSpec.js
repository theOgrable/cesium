/*global defineSuite*/
defineSuite([
         'Scene/FrameRateMonitor',
         'Core/defined',
         'Core/getTimestamp',
         'Specs/createScene',
         'Specs/destroyScene'
     ], function(
             FrameRateMonitor,
             defined,
             getTimestamp,
             createScene,
             destroyScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var scene;
    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        destroyScene(scene);
    });

    var monitor;
    afterEach(function() {
        if (defined(monitor)) {
            monitor.destroy();
            monitor = undefined;
        }
    });

    function spinWait(milliseconds) {
        var endTime = getTimestamp() + milliseconds;
        while (getTimestamp() < endTime) {
        }
    }

    it('throws when constructed without a scene', function() {
        expect(function() {
            monitor = new FrameRateMonitor();
        }).toThrow();

        expect(function() {
            monitor = new FrameRateMonitor({});
        }).toThrow();
    });

    it('can be constructed with just a scene', function() {
        monitor = new FrameRateMonitor({
            scene : scene
        });

        expect(monitor.samplingWindow).toBe(5000);
        expect(monitor.quietPeriod).toBe(2000);
        expect(monitor.warmupPeriod).toBe(5000);
        expect(monitor.minimumFrameRateDuringWarmup).toBe(4);
        expect(monitor.minimumFrameRateAfterWarmup).toBe(8);
        expect(monitor.scene).toBe(scene);
        expect(monitor.lowFrameRate.numberOfListeners).toBe(0);
        expect(monitor.nominalFrameRate.numberOfListeners).toBe(0);
    });

    it('honors parameters to the constructor', function() {
        monitor = new FrameRateMonitor({
            scene : scene,
            samplingWindow : 3000,
            quietPeriod : 1000,
            warmupPeriod : 6000,
            minimumFrameRateDuringWarmup : 1,
            minimumFrameRateAfterWarmup : 2
        });

        expect(monitor.samplingWindow).toBe(3000);
        expect(monitor.quietPeriod).toBe(1000);
        expect(monitor.warmupPeriod).toBe(6000);
        expect(monitor.minimumFrameRateDuringWarmup).toBe(1);
        expect(monitor.minimumFrameRateAfterWarmup).toBe(2);
        expect(monitor.scene).toBe(scene);
    });

    it('raises the lowFrameRate event on low frame rate', function() {
        monitor = new FrameRateMonitor({
            scene : scene,
            quietPeriod : 1,
            warmupPeriod : 1,
            samplingWindow : 1,
            minimumFrameRateDuringWarmup : 1000,
            minimumFrameRateAfterWarmup : 1000
        });

        var spyListener = jasmine.createSpy('listener');
        monitor.lowFrameRate.addEventListener(spyListener);

        // Rendering once starts the quiet period
        scene.render();

        // Wait until we're well past the end of the quiet period.
        spinWait(2);

        // Rendering again records our first sample.
        scene.render();

        // Wait well over a millisecond, which is the maximum frame time allowed by this instance.
        spinWait(2);

        // Record our second sample.  The monitor should notice that our frame rate is too low.
        scene.render();

        expect(spyListener).toHaveBeenCalled();
    });

    it('does not report a low frame rate during the quiet period', function() {
        monitor = new FrameRateMonitor({
            scene : scene,
            quietPeriod : 1000,
            warmupPeriod : 1,
            samplingWindow : 1,
            minimumFrameRateDuringWarmup : 1000,
            minimumFrameRateAfterWarmup : 1000
        });

        var spyListener = jasmine.createSpy('listener');
        monitor.lowFrameRate.addEventListener(spyListener);

        // Rendering once starts the quiet period
        scene.render();

        // Wait well over a millisecond, which is the maximum frame time allowed by this instance.
        spinWait(2);

        // Render again.  Even though our frame rate is too low, the monitor shouldn't raise the event because we're in the quiet period.
        scene.render();

        expect(spyListener).not.toHaveBeenCalled();
    });

    it('the nominalFrameRate event is raised after the warmup period if the frame rate returns to nominal', function() {
        monitor = new FrameRateMonitor({
            scene : scene,
            quietPeriod : 1,
            warmupPeriod : 1,
            samplingWindow : 1,
            minimumFrameRateDuringWarmup : 10,
            minimumFrameRateAfterWarmup : 10
        });

        var lowListener = jasmine.createSpy('lowFrameRate');
        monitor.lowFrameRate.addEventListener(lowListener);

        var nominalListener = jasmine.createSpy('nominalFrameRate');
        monitor.nominalFrameRate.addEventListener(nominalListener);

        // Rendering once starts the quiet period
        scene.render();

        // Wait until we're well past the end of the quiet period.
        spinWait(2);

        // Rendering again records our first sample.
        scene.render();

        // Wait 120 millseconds, which is over the maximum frame time allowed by this instance.
        spinWait(120);

        // Record our second sample.  The monitor should notice that our frame rate is too low.
        scene.render();

        expect(lowListener).toHaveBeenCalled();

        // Render as fast as possible for a samplingWindow, quietPeriod, and warmupPeriod.
        var endTime = getTimestamp() + 50;
        while (getTimestamp() < endTime) {
            scene.render();
        }

        // The nominalFrameRate event should have been raised.
        expect(nominalListener).toHaveBeenCalled();
    });
}, 'WebGL');