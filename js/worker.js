if (self.window && self.document) {

    document.addEventListener('DOMContentLoaded', function () { console.log("master page loaded") }, false)

    function time() {
        return new Date().getTime();
    }

    function blast() {
        blasts++;
        blastAt = time();
        workers.forEach(function(worker) {
            var copy = new Float32Array(bulk.buffer.slice(0)),
                bulkBuffer = copy.buffer;
            worker.postMessage({bulk:bulkBuffer}, [bulkBuffer]);
        });
    }

    function newWorker(report) {
        var worker = new Worker("worker.js");
        workers.push(worker);
        worker.onmessage = report;
        waiting++;
        return worker;
    }

    function testMaxMem1Worker(report) {
        testMaxMemNWorkers(1, report);
    }

    function testMaxMem2Workers(report) {
        testMaxMemNWorkers(2, report);
    }

    function testMaxMem3Workers(report) {
        testMaxMemNWorkers(3, report);
    }

    function testMaxMemNWorkers(count, report) {
        function onreport(evt) {
            var data = evt.data;
            console.log({iter: blasts, id: data.id, got: data.size, in:(time() - blastAt)});
            report(data);
            if (--waiting === 0) {
                waiting = workers.length;
                blast();
            }
        };
        while (count-- > 0) newWorker(onreport).postMessage({id:workers.length});
        blast();
    }

    // 10 mb cloned for each send
    var bulk = new Float32Array(50000000);
    var LS = localStorage;
    var workers = [];
    var tests = [
        testMaxMem1Worker,
        testMaxMem2Workers,
        testMaxMem3Workers
    ];
    var kicked = 0;
    var waiting = 0;
    var blastAt = 0;
    var blasts = 0;

    // kick first unkicked test
    for (var i=0; i<tests.length; i++) {
        var test = tests[i];
        var name = test.name;
        if (LS[name]) continue;

        var state = LS[test.name] = {
            first: time(),
            report: {}
        };
        LS[name] = JSON.stringify(state);

        kicked++;
        console.log("kicking test "+test.name);
        test(function(info) {
            state.report[info.id] = info;
            state.last = time();
            LS[test.name] = JSON.stringify(state);
        });

        break;
    }

    if (!kicked) {
        console.log("test results");
        tests.forEach(function(test) {
            var name = test.name;
            test = JSON.parse(LS[name]);
            console.log("----- "+name+" took "+(test.last - test.first));
            console.log(test);
        });
    }

} else {

    var cache = [],
        id = 0;

    self.onmessage = function(evt) {
        var data = evt.data;

        if (data.id) {
            id = data.id;
            console.log("start worker "+data.id);
        }
        if (data.bulk) {
            bulk = new Float32Array(data.bulk);
            cache.push(bulk);
            self.postMessage({id:id, size:cache.length * bulk.byteLength});
        }
    }
}
