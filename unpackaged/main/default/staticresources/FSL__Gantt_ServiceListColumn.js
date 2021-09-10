'use strict';

(function () {
    angular.module('serviceExpert').directive('serviceListColumn', ['utils', function (utils) {

        function linkFunc(scope, element, attrs) {

            scope.isFormulaForImage = utils.isFormulaForImage;

            scope.getType = function () {

                if (scope.field.FullAPIName === window.fieldNames.Service_Appointment.GanttIcon__c) {
                    return 'gantt-icons';
                }

                // REMOVING SUPPORT FOR STRING AS URL - CAUSE PERFORMANCE ISSUES WITH LARGE AMOUNT OF DATA
                // if ( (scope.field.Type === 'STRING' || scope.field.Type === 'TEXTAREA') && utils.isUrlImg(scope.service[scope.field.FullAPIName])) {
                //     return 'url-icon';
                // }

                if ((scope.field.Type === 'STRING' || scope.field.Type === 'TEXTAREA') && utils.isFormulaForImage(scope.service[scope.field.FullAPIName])) {
                    return 'url-formula-icon';
                }

                return 'normal';
            };
        }

        return {
            restrict: 'E',
            link: linkFunc,
            scope: {
                service: '=',
                field: '='
            },
            template: '\n            \n            <span>\n                <span ng-if="getType() == \'normal\'">{{service | displayFieldSetField : field}}</span>\n                <img ng-if="getType() == \'gantt-icons\'" class="img-on-service-list" ng-repeat="img in service.icons track by $index" ng-src="{{img}}" track by $index/>\n                <img ng-if="getType() == \'url-icon\'" class="img-on-service-list" ng-src="{{service[field.FullAPIName]}}" />\n                <img ng-if="getType() == \'url-formula-icon\'" class="img-on-service-list" ng-src="{{isFormulaForImage(service[field.FullAPIName])}}" />\n            </span>    \n            '
        };
    }]);
})();