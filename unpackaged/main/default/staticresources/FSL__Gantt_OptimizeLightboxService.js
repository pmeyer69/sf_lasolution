'use strict';

(function () {

    optimizeLightboxService.$inject = ['$compile', '$rootScope', 'ResourcesAndTerritoriesService', 'userSettingsManager', 'StateService', 'servicesService', 'utils', 'sfdcService'];

    angular.module('serviceExpert').factory('optimizeLightboxService', optimizeLightboxService);

    function optimizeLightboxService($compile, $rootScope, ResourcesAndTerritoriesService, userSettingsManager, StateService, servicesService, utils, sfdcService) {
        var $scope = null,
            minutes = [];

        for (var m = 0; m < 60; m++) {
            minutes.push(m);
        }

        // open the UI
        function open() {

            // create new isolated scope
            $scope = $rootScope.$new(true);

            // add ESC shortcut
            $scope.$on('keypress', function (broadcastData, e) {
                if (e.which == 27) {
                    $scope.$evalAsync($scope.closeLightbox);
                }
            });

            // get filtered locations
            var filteredLocationsIds = userSettingsManager.GetUserSettingsProperty('locations');
            $scope.filteredLocations = filteredLocationsIds.map(function (id) {
                return ResourcesAndTerritoriesService.territories()[id];
            });

            // some settings and initializations
            setDatesAndStuff();
            $scope.dateSelectFinishWidget = dateSelectFinishWidget;
            $scope.dateSelectStartWidget = dateSelectStartWidget;
            $scope.validateDatesStart = validateDatesStart;
            $scope.validateDatesEnd = validateDatesEnd;
            $scope.optimizeAllServices = 'all';
            $scope.runOptimizion = runOptimizion;
            $scope.selectedLocations = {};
            $scope.checkBoxFields = utils.checkBoxFields;
            $scope.optimizeSelectedFilter = 'noFilter';
            $scope.orphanServices = false;
            $scope.isInDayPolicy = isInDayPolicy;

            // set policies
            $scope.policyOptions = StateService.policies;
            $scope.selectedPolicy = $scope.policyOptions[0];

            for (var i = 0; i < StateService.policies.length; i++) {
                if (StateService.policies[i].Id === StateService.selectedPolicyId) {
                    $scope.selectedPolicy = StateService.policies[i];
                    break;
                }
            }

            // add to body
            var lightboxDomElement = generateTemplate();
            lightboxDomElement.find('#BulkActionsLightbox').draggable({ containment: 'document', handle: '#UnschduleLightboxHeader' });
            angular.element('body').append(lightboxDomElement);

            // close the UI
            $scope.closeLightbox = closeLightbox;

            // on destroy, remove DOM elements
            $scope.$on('$destroy', function () {
                return lightboxDomElement.remove();
            });

            // compile
            $compile(lightboxDomElement)($scope);

            // show lightbox
            lightboxDomElement.show();
            StateService.setLightBoxStatus(); // set lightbox state to open
            lightboxDomElement.children().find('input[type=checkbox]').focus();
        }

        // close lightbox
        function closeLightbox() {
            StateService.setLightBoxStatus(false); // set lightbox state to close
            $scope.$destroy();
        }

        // select date widget (finish date)
        function dateSelectFinishWidget(position) {

            if (scheduler.isCalendarVisible()) {
                scheduler.destroyCalendar();
            } else {

                scheduler.renderCalendar({
                    position: position,
                    date: new Date($scope.actionFinish),
                    navigation: true,
                    handler: function handler(date, calendar) {
                        var newDate = new Date(date);
                        newDate.setMinutes(parseInt($scope.endMinutes));
                        newDate.setHours(parseInt($scope.endHour));

                        if (newDate < $scope.actionStart) {
                            alert(customLabels.finishAfterStart);
                        } else {
                            $scope.actionFinish = newDate;
                        }

                        scheduler.destroyCalendar();
                        $scope.$apply();
                    }
                });
            }
        }

        // select date widget (start date)
        function dateSelectStartWidget(position) {

            if (scheduler.isCalendarVisible()) {
                scheduler.destroyCalendar();
            } else {

                scheduler.renderCalendar({
                    position: position,
                    date: new Date($scope.actionStart),
                    navigation: true,
                    handler: function handler(date, calendar) {
                        var newDate = new Date(date);
                        newDate.setMinutes(parseInt($scope.startMinutes));
                        newDate.setHours(parseInt($scope.startHour));

                        if (newDate > $scope.actionFinish) {
                            alert(customLabels.startBeforeEnd);
                        } else {
                            $scope.actionStart = newDate;
                        }

                        scheduler.destroyCalendar();
                        $scope.$apply();
                    }
                });
            }
        }

        // validate start date
        function validateDatesStart() {
            var newDate = new Date($scope.actionStart);
            newDate.setMinutes(parseInt($scope.startMinutes));
            newDate.setHours(parseInt($scope.startHour));

            if (newDate >= $scope.actionFinish) {
                alert(customLabels.startBeforeEnd);
                $scope.startMinutes = $scope.actionStart.getMinutes();
                $scope.startHour = $scope.actionStart.getHours().toString();
            } else {
                $scope.actionStart = newDate;
            }
        }

        // validate end date
        function validateDatesEnd() {
            var newDate = new Date($scope.actionFinish);
            newDate.setMinutes(parseInt($scope.endMinutes));
            newDate.setHours(parseInt($scope.endHour));

            if (newDate <= $scope.actionStart) {
                alert(customLabels.finishAfterStart);
                $scope.endMinutes = $scope.actionFinish.getMinutes().toString();
                $scope.endHour = $scope.actionFinish.getHours().toString();
            } else {
                $scope.actionFinish = newDate;
            }
        }

        // set dates
        function setDatesAndStuff() {
            $scope.actionStart = new Date(scheduler.getState().min_date.getFullYear(), scheduler.getState().min_date.getMonth(), scheduler.getState().min_date.getDate(), 0, 0, 0);
            $scope.actionFinish = new Date(scheduler.getState().max_date.getFullYear(), scheduler.getState().max_date.getMonth(), scheduler.getState().max_date.getDate(), 0, 0, 0);
            $scope.startHour = '0';
            $scope.endHour = '0';
            $scope.startMinutes = '0';
            $scope.endMinutes = '0';
        }

        // run unschedule
        function runOptimizion() {

            var ids = [],
                startDate = void 0,
                finishDate = void 0,
                filterField = void 0,
                optimizeAll = void 0;

            for (var id in $scope.selectedLocations) {
                $scope.selectedLocations[id] && ids.push(id);
            }

            if (ids.length === 0) {
                alert(customLabels.noLocationWasSelected);
                return;
            }

            // set dates
            startDate = $scope.actionStart;
            finishDate = $scope.actionFinish;
            finishDate.setDate(finishDate.getDate() + 1);

            // set filter by boolean
            filterField = $scope.optimizeSelectedFilter === 'noFilter' ? null : $scope.optimizeSelectedFilter;

            // optimize all
            optimizeAll = $scope.optimizeAllServices === 'all';

            StateService.setBulkActionRunning();

            // run optimization
            sfdcService.callRemoteAction(RemoteActions.runOptimization, startDate, finishDate, ids, optimizeAll, $scope.orphanServices, $scope.selectedPolicy.Id, filterField).then(function (req_id) {
                if (!req_id) {
                    utils.addNotification(customLabels.Action_Could_Not_Be_Performed, customLabels.user_is_not_allowed_to_perform_action);
                } else {

                    sfdcService.callRemoteAction(RemoteActions.getRequestObject, req_id).then(function (req_obj) {
                        if (req_obj[fieldNames.Optimization_Request.Status__c] != customLabels.failed) {
                            utils.addNotification(customLabels.Optimization_Request_Sent, customLabels.Optimization_sent_details, function (id) {
                                utils.openSObjectLink('../' + id);
                            }, req_obj.Id);
                        } else {
                            utils.addNotification(customLabels.Optimization_Failed, customLabels.error_in_opt, function (id) {
                                utils.openSObjectLink('../' + id);
                            }, req_obj.Id);
                        }
                    });
                }
            }).catch(function (err) {
                console.warn('runOptimization failed :(');
                console.log(err);
            }).finally(function () {
                StateService.setBulkActionRunning(false);
            });

            $scope.closeLightbox();
        }

        function isInDayPolicy() {
            return $scope.selectedPolicy[fieldNames.SchedulingPolicy.DailyOptimization];
        }

        // DOM element
        function generateTemplate() {

            var datePickersDOM = customLabels.starting_from_x_until_y_including_z_services.replace('$0', '<u id="bulkStartOptimize" class="bulkDatePicker" ng-click="dateSelectStartWidget(\'bulkStartOptimize\')" ng-bind="actionStart | amDateFormat:\'ll\'"></u>').replace('$1', '<u id="bulkFinishOptimize" class="bulkDatePicker" ng-click="dateSelectFinishWidget(\'bulkFinishOptimize\')" ng-bind="actionFinish | amDateFormat:\'ll\'"></u>').replace('$2', '<select class="bulkStatusWidth RightArrowForSelect" ng-model="optimizeAllServices">\n\t\t\t\t\t\t\t\t<option value="all">' + customLabels.All + '</option>\n\t\t\t\t\t\t\t\t<option value="unscheduled">' + customLabels.UnscheduledCapital + '</option>\n\t\t\t\t\t\t\t</select>');

            var optimizationOptions = '<div id="PolicyInOptimize">' + customLabels.Use_the_following_policy_x_and_y.replace('$0', '<select class="bulkStatusWidth RightArrowForSelect" ng-model="selectedPolicy" title="{{selectedPolicy.Name}}" ng-change="changePolicy()" ng-options="policy.Name for policy in policyOptions"></select>').replace('$1', '<select ng-model="optimizeSelectedFilter" class="bulkStatusWidth RightArrowForSelect">\n\t\t\t\t\t\t\t\t \t<option ng-repeat="(fieldName, fieldLbl) in checkBoxFields()" value="{{fieldName}}" ng-bind="fieldLbl"></option>\n\t\t\t\t\t\t\t\t \t<option value="noFilter">' + customLabels.None + '</option>\n\t\t\t\t\t\t\t\t </select>') + '</div>';

            return angular.element('\n                <div class="LightboxBlackContainer">\n                    <div id="BulkActionsLightbox" class="LightboxContainer OptimizationLightbox">\n\n                        <div class="lightboxHeaderContainer" id="UnschduleLightboxHeader">\n                            <svg ng-click="closeLightbox()" aria-hidden="true" class="slds-icon CloseLightbox" fsl-key-press tabindex="0">\n                                \u2028<use xlink:href="' + lsdIcons.close + '"></use>\n                            \u2028</svg>\n                            <h1 class="light-box-header">' + customLabels.Optimize + '</h1>\n                        </div>\n\n\n                        <div class="lightboxContentContainer">\n\n                            <p class="bulkExplain">' + customLabels.SelectServicesOptimize + '</p>\n\n                            <div class="selectedTargetLocations">\n                                <label for="bulkRadioSelectedIds">' + customLabels.ChooseLocationsLB + '</label>\n                            </div>\n\n\n                            <div id="bulkLocationNames">\n                                <div ng-repeat="location in filteredLocations track by $index" class="BulkActionLocationName">\n                                    <input ng-model="selectedLocations[location.id]" type="checkbox" id="bulkLocationUnschedule_{{ location.id }}"/>\n                                    <label title="{{ location.name }}" for="bulkLocationUnschedule_{{ location.id }}">{{location.name}}</label>\n                                </div>\n\n                                <div>\n                                    <input ng-model="orphanServices" type="checkbox" name="orphanLocationsOptimize" id="orphanLocationsOptimize" />\n                                    <label for="orphanLocationsOptimize">' + customLabels.IncludeServicesNoLocations + '</label>\n                                </div>\n                            </div>\n\n\n                            <div class="bulkOptimizeOptions">\n                                ' + datePickersDOM + '\n                                ' + optimizationOptions + '\n                                <div class="inday-policy-selected" ng-show="isInDayPolicy()">' + customLabels.In_Day_Policy_Selected + '</div>\n                            </div>\n\n                        </div>\n\n                        <div class="lightboxControllers">\n                            <button class="lightboxSaveButton" ng-click="runOptimizion()">' + customLabels.Optimize + '</button>\n                        </div>\n\n\n                    </div>\n                </div>\n            ');
        }

        // This will be our factory
        return {
            open: open
        };
    }
})();