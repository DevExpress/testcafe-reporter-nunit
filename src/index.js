var readSync = require('read-file-relative').readSync;
var Mustache = require('mustache');
var path     = require('path');


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


function NUnitReporterPlugin () {
    return {
        rootPath: '',
        noColors: true,

        testResults:    null,
        currentFixture: null,

        reportTaskStart: function (startTime, userAgents, total) {
            this.testResults = {
                name:      'TestCafe Tests',
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

        reportTestDone: function (name, testRunInfo) {
            var test        = {};
            var reporter    = this;
            var testSuccess = !testRunInfo.errs.length;

            try {
                var fixtureDir  = path.dirname(this.currentFixture.path);
                var fixtureName = this.currentFixture.name;

                if (this.rootPath) {
                    var virtualPath = path.sep + path.relative(this.rootPath, fixtureDir);

                    fixtureName = path.join(virtualPath, fixtureName);
                }

                test = {
                    name:    "'" + fixtureName + "' - " + name + (testRunInfo.unstable ? ' (unstable)' : ''),
                    time:    testRunInfo.durationMs / 1000,
                    result:  successToResult(testSuccess),
                    success: successToString(testSuccess),
                    errs:    testRunInfo
                                 .errs
                                 .map(function (err) {
                                     return reporter.formatError(err);
                                 })
                                 .join('\n\n')
                };
            } catch (e) {
                testSuccess = false;

                test = {
                    name:    '[' + Date().toLocaleString() + '] Reporter exception on test done',
                    time:    0,
                    result:  successToResult(false),
                    success: successToString(false),
                    errs:    'Reporter error: ' + e.message + '\n' + e.stack
                };

            }

            this.currentFixture.tests.push(test);

            this.currentFixture.time += test.time;

            if (!testSuccess) {
                this.currentFixture.result  = successToResult(false);
                this.currentFixture.success = successToString(false);
            }
        },

        reportTaskDone: function (endTime, passed) {
            try {
                this.testResults.failures = (this.testResults.total - passed);

                var startDate = new Date(this.testResults.startTime);
                var endDate   = new Date(endTime);

                this.testResults.date    = endDate.getFullYear() + '-' + (endDate.getMonth() + 1) + '-' +
                                           endDate.getDate();
                this.testResults.time    = parseTime(endDate);
                this.testResults.runTime = (endDate.getTime() - startDate.getTime()) / 1000;

                var success = this.testResults.failures === 0;

                this.testResults.result  = successToResult(success);
                this.testResults.success = successToString(success);

                var nunitTemplate = readSync('../data/template.mustache');

                this.write(Mustache.render(nunitTemplate, this.testResults));
            } catch (e) {
                console.log(e.stack);
            }

        }
    };
}

NUnitReporterPlugin.withRootPath = function (rootPath) {
    return function () {
        var reporter = NUnitReporterPlugin();

        reporter.rootPath = rootPath;

        return reporter;
    }
};

module.exports = NUnitReporterPlugin;

