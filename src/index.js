var readSync = require('read-file-relative').readSync;
var Mustache = require('mustache');


function successToResult (success) {
    return success ? 'Success' : 'Failure';
}

function successToString (success) {
    return success ? 'True' : 'False';
}

function numberToString (number) {
    return number < 10 ? '0' + number : number.toString();
}

function parseTime (date) {
    return [
        numberToString(date.getHours()),
        numberToString(date.getMinutes()),
        numberToString(date.getSeconds())
    ].join(':');
}


module.exports = function () {
    return {
        noColors: true,

        testResults:    null,
        currentFixture: null,

        reportTaskStart: function (startTime, userAgents, total) {
            this.testResults = {
                name:  'TestCafe Tests',
                total:     total,
                failures:  0,
                startTime: startTime,
                date:      null,
                time:      '',
                runTime:   0,
                result:    '',
                success:   '',
                fixtures:  []
            };
        },

        reportFixtureStart: function (name, path) {
            this.currentFixture = {
                name:    name,
                path:    path,
                time:    0,
                result:  successToResult(true),
                success: successToString(true),
                tests:   []
            };

            this.testResults.fixtures.push(this.currentFixture);
        },

        reportTestDone: function (name, errs, durationMs) {
            try {
                var reporter = this;
                var testSuccess = !errs.length;

                var test = {
                    name:    "'" + this.currentFixture.name + "' - " + name,
                    time:    durationMs / 1000,
                    result:  successToResult(testSuccess),
                    success: successToString(testSuccess),
                    errs:    errs
                                 .map(function (err) {
                                     return reporter.formatError(err);
                                 })
                                 .join('\n\n')
                };

                this.currentFixture.tests.push(test);

                this.currentFixture.time += test.time;

                if (!testSuccess) {
                    this.currentFixture.result  = successToResult(false);
                    this.currentFixture.success = successToString(false);
                }
            } catch (e) {
                console.log(e);
            }

        },

        reportTaskDone: function (endTime, passed) {
            try {
                this.testResults.failures = (this.testResults.total - passed);

                    var startDate = new Date(this.testResults.startTime);
                    var endDate   = new Date(endTime);

                    this.testResults.date    = endDate.getFullYear() + '-' + (endDate.getMonth() + 1) + '-' + endDate.getDate();
                    this.testResults.time    = parseTime(endDate);
                    this.testResults.runTime = (endDate.getTime() - startDate.getTime()) / 1000;

                    var success = this.testResults.failures === 0;

                    this.testResults.result  = successToResult(success);
                    this.testResults.success = successToString(success);

                    var nunitTemplate = readSync('../data/template.mustache');

                    this.write(Mustache.render(nunitTemplate, this.testResults));
            } catch (e) {
                console.log(e);
            }

        }
    };
};

