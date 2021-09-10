'use strict';

(function () {
    angular.module('serviceExpert').directive('serviceListPreview', ['utils', 'FieldSetFieldsService', 'StateService', function (utils, FieldSetFieldsService, StateService) {

        var fields = [];
        var isRtlDirection = StateService.isRtlDirection();

        FieldSetFieldsService.fieldsSetFields().then(function (fieldsSetFieldsObject) {
            fields = fieldsSetFieldsObject.servicePreview;
        });

        function linkFunc(scope, element, attrs) {

            var shouldRun = true;

            scope.fields = function () {
                return fields;
            };

            scope.handleOver = function (e) {

                e.stopPropagation();

                // if (!shouldRun) {
                //     return;
                // }

                var bodyRect = document.body.getBoundingClientRect(),
                    elemRect = $(element).find('.service-quick-view')[0].getBoundingClientRect(),
                    offset_x = elemRect.x - bodyRect.x + 37,
                    offset_y = elemRect.top - bodyRect.top,
                    offset_right = bodyRect.right - elemRect.right + 37,
                    previewElement = $(element).find('.service-preview')[0];

                previewElement.style.display = 'inline-block';
                $(element).find('.service-preview-triangle')[0].style.display = 'inline-block';

                if (document.body.clientHeight < previewElement.clientHeight + previewElement.getBoundingClientRect().y) {
                    offset_y = document.body.clientHeight - previewElement.clientHeight - 26;
                }
                //RTL support
                if (isRtlDirection) {
                    previewElement.style.right = offset_right + 'px';
                } else {
                    previewElement.style.left = offset_x + 'px';
                }
                previewElement.style.top = offset_y + 'px';

                shouldRun = false;
            };

            scope.handleOut = function (e) {
                $(element).find('.service-preview-triangle')[0].style.display = 'none';
                $(element).find('.service-preview')[0].style.display = 'none';
            };

            // scope.handleOut = function(e) {

            //     let bodyRect = document.body.getBoundingClientRect(),
            //         elemRect = $(element).find('.service-quick-view')[0].getBoundingClientRect(),
            //         previewElement = $(element).find('.service-preview')[0];


            //     if ( previewElement.getBoundingClientRect().y +  previewElement.getBoundingClientRect().height + 30 < document.body.clientHeight) {
            //         shouldRun = true;
            //         previewElement.style.left = '';
            //         previewElement.style.top = '';
            //     }

            // }
        }

        return {
            restrict: 'E',
            link: linkFunc,
            scope: {
                service: '='
            },
            template: '\n            \n            <span>\n                <div class="service-quick-view" ng-mouseenter="handleOver($event)" ng-mouseleave="handleOut($event)">\n                    <svg aria-hidden="true" class="slds-icon">\n                        <use xlink:href="' + window.lsdIcons.info + '"></use>\n                    </svg>\n                </div>\n\n                <div class="service-preview-triangle"></div>\n\n                <div class="service-preview"> \n                    <div class="preview-field-container" ng-repeat="field in fields() track by $index">\n                        <b class="label-preview">{{field.Label}}</b>: <span ng-if="!service[field.APIName]">-</span> <service-list-column service="service" field="field"></service-list-column>\n                    </div>                    \n                </div>\n\n                \n            </span>    \n            '
        };
    }]);
})();