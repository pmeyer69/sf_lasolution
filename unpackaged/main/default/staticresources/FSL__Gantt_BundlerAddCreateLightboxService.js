'use strict';

(function () {

    BundlerAddCreateLightboxService.$inject = ['$q', '$filter', '$compile', 'ServiceAppointmentLightboxService', 'BundleService', '$rootScope', 'TimePhasedDataService', 'userSettingsManager', 'StateService', 'utils', 'sfdcService'];

    angular.module('serviceExpert').factory('BundlerAddCreateLightboxService', BundlerAddCreateLightboxService);

    function BundlerAddCreateLightboxService($q, $filter, $compile, ServiceAppointmentLightboxService, BundleService, $rootScope, TimePhasedDataService, userSettingsManager, StateService, utils, sfdcService) {

        var $scope = null;
        var df = void 0;
        var MAX_SA = 200; // 200

        var ERROR_NO_POLICY_SELECTED = 1;
        var ERROR_NO_BUNDLE_SELECTED = 2;
        var ERROR_NO_POLICY = 3;
        var ERROR_MAX_SA_SELECTED = 4;
        var ERROR_NO_SA_SELECTED = 5;

        // open the UI
        function open(sa, selectedPolicyId) {

            // create new isolated scope
            $scope = $rootScope.$new(true);
            $scope.deffered = $q.defer();
            df = $scope.deffered;

            $scope.lightboxServices = sa;
            $scope.mode = 'NEW';
            $scope.errorMode = 0;
            $scope.errorMsg = customLabels.ReviewBundleErrors;

            $scope.isNativeMode = true;
            $scope.workTypes = {};
            $scope.fullSaAll = {};

            $scope.skills = {};

            sa.forEach(function (s) {
                s.earlyStartView = $filter('amDateFormat')(s.earlyStart, 'l LT');
                s.dueDateView = $filter('amDateFormat')(s.dueDate, 'l LT');
            });

            sfdcService.callRemoteAction(RemoteActions.getWorkTypes).then(function (res) {

                res.forEach(function (w) {

                    $scope.workTypes[w['Id']] = w['Name'];
                });

                $scope.showData2 = true;
            });

            sfdcService.callRemoteAction(RemoteActions.getWorkOrders).then(function (res) {

                res.forEach(function (w) {
                    if (w && w.SkillRequirements) {

                        for (var i = 0; i < w.SkillRequirements.length; i++) {
                            $scope.skills[w.Id] = $scope.skills[w.Id] || [];
                            $scope.skills[w.Id].push(w.SkillRequirements[i].Skill.MasterLabel);
                        }
                    }
                });

                $scope.showData = true;
            });

            sfdcService.callRemoteAction(RemoteActions.getBundleApexMode).then(function (res) {

                $scope.isNativeMode = res;

                if (!res) {

                    sfdcService.callRemoteAction(RemoteActions.getBundlePolicy).then(function (res) {

                        $scope.bundlerPolicyArr = [];
                        $scope.bundlerPolicyMap = {};

                        if (res.length == 0) {

                            $scope.errorMode = ERROR_NO_POLICY;
                            $scope.errorMsg = customLabels.NoBundlePolicies;
                            // $scope.bundlerPolicyArr.push( 'No Bundle Policies. Please create a Bundle Policy.'  );
                        }

                        res.forEach(function (w) {

                            shortPolicyName = w['Name'].length > 36 ? w['Name'].substring(0, 33) + '...' : w['Name'];

                            $scope.bundlerPolicyNamesMapLookup[shortPolicyName] = w['Name'];

                            $scope.bundlerPolicyArr.push(shortPolicyName);
                            $scope.bundlerPolicyMapLookup[shortPolicyName] = w['Id'];
                            $scope.bundlerPolicyMap[w['Id']] = shortPolicyName;
                        }, function (err) {
                            console.error(err);
                        });
                    });
                }
            });

            $scope.selectedValue = 'cleared';
            $scope.cleared = false;
            $scope.fraudulent = false;
            $scope.reviewed = false;
            $scope.selectedPolicyId = selectedPolicyId;
            $scope.selectedSa = {};
            $scope.lightboxServices.forEach(function (e) {
                $scope.selectedSa[e.id] = true;
                $scope.fullSaAll[e.id] = e;
            });

            // add ESC shortcut
            $scope.$on('keypress', function (broadcastData, e) {
                if (e.which == 27) {
                    $scope.$evalAsync($scope.closeLightbox);
                    df.reject('closed');
                }
            });

            $scope.bundlers = [];
            $scope.bundlerMap = {};
            $scope.bundlerFullNameMap = {};

            $scope.bundlerPolicyMap = {};
            $scope.bundlerPolicyMapLookup = {};
            $scope.bundlerPolicyNamesMapLookup = {};
            $scope.bundlerPolicyArr = [];

            var shortPolicyName = '';

            // Get the bundled sa 
            for (var _sa in TimePhasedDataService.serviceAppointments()) {
                var currentSA = TimePhasedDataService.serviceAppointments()[_sa];
                if (currentSA.isBundle) {

                    $scope.bundlers.push(currentSA.name);
                    $scope.bundlerMap[currentSA.name] = currentSA.id;
                    $scope.bundlerFullNameMap[currentSA.id] = currentSA.name;
                };
            }

            // add to body
            var lightboxDomElement = generateTemplate();
            lightboxDomElement.find('#BundlerLightbox').draggable({ containment: 'document', handle: '#BundlerLightboxHeader' });
            angular.element('body').append(lightboxDomElement);

            $scope.closeLightbox = closeLightbox;
            $scope.setMode = setMode;
            $scope.apply = apply;
            $scope.clearError = clearError;
            $scope.toggleSelection = toggleSelection;
            $scope.allSelection = allSelection;
            $scope.nonSelected = nonSelected;
            $scope.getAllSelected = getAllSelected;
            $scope.editSa = editSa;
            $scope.checkMax = checkMax;
            $scope.selectedCount = selectedCount;

            // on destroy, remove DOM elements
            $scope.$on('$destroy', function () {
                return lightboxDomElement.remove();
            });

            // compile
            $compile(lightboxDomElement)($scope);

            // show lightbox
            lightboxDomElement.show();
            StateService.setLightBoxStatus(); // set lightbox state to open

            checkMax();

            return $scope.deffered.promise;
        }

        // close lightbox
        function closeLightbox(applied) {
            StateService.setLightBoxStatus(false); // set lightbox state to close
            $scope.$destroy();
            if (!applied) {
                $scope.deffered.reject('closed');
            }

            //   df.reject('closed'); // this will remove the loading animation when the popup is closed but the btn will be active again.
        }

        function selectedCount() {

            var count = 0;
            Object.keys($scope.selectedSa).map(function (key) {
                if ($scope.selectedSa[key]) {
                    count++;
                }
            });
            return count;
        }

        function checkMax() {

            if ($scope.errorMode == ERROR_MAX_SA_SELECTED) {
                $scope.errorMode = 0;
            }

            if ($scope.errorMode) {
                return;
            }

            var count = selectedCount();

            if (count > MAX_SA) {
                // MAX_SA

                $scope.errorMode = ERROR_MAX_SA_SELECTED;
                var str = customLabels.SelectedServiceAppointmentMax;
                str = str.replace("(0)", MAX_SA);
                $scope.errorMsg = str.replace("(1)", count - MAX_SA);
            }
        }

        function setMode(mode) {
            $scope.mode = mode;
        }

        function editSa(id) {
            ServiceAppointmentLightboxService.open(id);
        }

        function toggleSelection(saId) {

            $scope.selectedSa[saId] = !$scope.selectedSa[saId];

            checkMax();
        }

        function getAllSelected() {

            var allSelected = true;

            Object.keys($scope.selectedSa).map(function (key) {
                if (!$scope.selectedSa[key]) {
                    allSelected = false;
                }
            });
            return allSelected;
        }

        function nonSelected() {

            var nonSelected = true;

            Object.keys($scope.selectedSa).map(function (key) {
                if ($scope.selectedSa[key]) {
                    nonSelected = false;
                }
            });

            if (!$scope.bundlerMap[$scope.existingBundler] && $scope.mode === 'UPDATE') {
                nonSelected = true;
            }

            if ((!$scope.selectedBundlePolicy || !$scope.bundlerPolicyMapLookup[$scope.selectedBundlePolicy]) && $scope.mode === 'NEW') {
                nonSelected = true;
            }

            if ($scope.isNativeMode && $scope.mode === 'NEW') {
                nonSelected = false;
            }

            return nonSelected;
        }
        function allSelection() {

            if ($scope.getAllSelected()) {

                $scope.lightboxServices.forEach(function (e) {
                    $scope.selectedSa[e.id] = false;
                });
            } else {

                $scope.lightboxServices.forEach(function (e) {
                    $scope.selectedSa[e.id] = true;
                });
            }

            checkMax();
        }

        function clearError() {

            if ($scope.errorMode == ERROR_NO_POLICY) {
                return;
            }

            $scope.errorMode = 0;

            checkMax();
        }

        function apply() {

            if ($scope.errorMode == ERROR_NO_POLICY || $scope.errorMode == ERROR_MAX_SA_SELECTED) {
                return;
            }

            if (selectedCount() == 0) {
                $scope.errorMode = ERROR_NO_SA_SELECTED;
                $scope.errorMsg = customLabels.BundleNotSelected;
                return;
            }

            $scope.errorMsg = customLabels.ReviewBundleErrors;

            $scope.errorMode = 0;

            var policyId = $scope.isNativeMode ? $scope.selectedPolicyId : $scope.bundlerPolicyMapLookup[$scope.selectedBundlePolicy]; // if demo policy from opened , else from dropdown

            var existingBundler = $scope.bundlerMap[$scope.existingBundler];

            var saIdsList = [];
            var fullSa = [];

            Object.keys($scope.selectedSa).map(function (key) {
                if ($scope.selectedSa[key]) {
                    saIdsList.push(key);
                    fullSa.push($scope.fullSaAll[key]);
                }
            });

            if ($scope.mode == 'NEW') {

                if (policyId == undefined && $scope.isNativeMode == false) {
                    $scope.errorMode = ERROR_NO_POLICY_SELECTED;
                    return;
                }

                BundleService.bundleServiceAppointments(saIdsList, policyId, fullSa).then(function (res) {

                    console.log(res);
                    df.resolve(res);
                }, function () {

                    df.reject('closed');
                });
            } else {
                // update mode

                if (existingBundler == undefined) {
                    $scope.errorMode = ERROR_NO_BUNDLE_SELECTED;
                    return;
                }

                BundleService.updateBundleServiceAppointments(saIdsList, policyId, existingBundler, $scope.existingBundler).then(function (res) {

                    df.resolve(res);
                }, function () {

                    df.reject('closed');
                });
            }

            closeLightbox(true);
        }

        // DOM element
        function generateTemplate() {

            return angular.element('\n                <div class="LightboxBlackContainer" id="createUpdateBundlePopup" >\n                    <div id="BundlerLightbox" class="LightboxContainer">\n\n                        <div class="lightboxHeaderContainer" id="BundlerLightboxHeader">\n                            <svg ng-click="closeLightbox(false)" aria-hidden="true" class="slds-icon CloseLightbox" fsl-key-press tabindex="0">\n                                <use xlink:href="' + lsdIcons.close + '"></use>\n                            </svg>\n                            <h1 class="light-box-header">' + customLabels.BundleCaption + '</h1>\n                        </div>\n\n                        <div class="lightboxContentContainer">\n\n                       <div  ng-show="errorMode != 0" class=\'slds-theme_error bundle-error\'> \n                            <svg aria-hidden="true" class="slds-icon bundler-error-icon">\n                                        <use xlink:href="' + lsdIcons.violation + '"></use>\n                                    </svg>\n                         {{errorMsg}}\n                        </div> \n                       \n\n                            <p class="saHeader">{{selectedCount()}} ' + customLabels.SelectedServiceAppointment + '</p>\n\n                            <div class="tableDiv slds">\n                                \n                                <table id="saTable" class="slds slds-table slds-table_cell-buffer slds-table_bordered" >\n                                        <thead>\n                                        <tr class="slds slds-line-height_reset">\n                                        <th> <input ng-checked="getAllSelected()" ng-click="allSelection()" type="checkbox" > </th>\n                                            <th>' + customLabels.SANumberHeader + '</th>\n                                            <th>' + customLabels.DurationHeader + '</th>\n                                            <th>' + customLabels.AddressHeader + '</th>\n                                            <th>' + customLabels.EarlyStartHeader + '</th>\n                                            <th>' + customLabels.DueDateHeader + '</th>\n                                            <th>' + customLabels.WorkTypeHeader + '</th>\n                                            <th>' + customLabels.AccountHeader + '</th>\n                                            <th>' + customLabels.RequiredSkillsHeader + '</th>\n                                        </tr>\n\n                                        </thead>\n                                        <tbody class=\'slds slds-tbody\'> \n                                        <tr class="slds slds-hint-parent dataRow maxHight30" ng-repeat="sa in lightboxServices | orderBy: \'name\' " >   \n                                        <td class="Width20">\n                                        <input ng-checked="showData && showData2 && selectedSa[sa.id]" ng-click="toggleSelection(sa.id)" type="checkbox" value="{{sa.id}}">\n                                        </td> \n                                            <td class="slds slds-truncate Width80" ng-attr-title="{{sa.name}}">\n                                                <a class="saLink ng-click="" target="_blank" href="../{{ sa.id }}" title="{{sa.name}}">{{showData && showData2 ? sa.name : \'\'}}</a>\n                                            </td>\n                                            <td class="slds slds-truncate Width80" ng-attr-title="{{sa.DurationInMinutes}}">\n                                                <span class="">{{showData && showData2 ? sa.DurationInMinutes : \'\'}}</span>\n                                            </td>\n                                            <td class="slds slds-truncate Width80" ng-attr-title="{{sa.City + \' \' + sa.Street}}">\n                                                <span class="">{{showData && showData2 ? sa.City + \' \' + sa.Street : \'\'}}</span>\n                                            </td>\n                                            <td class="slds slds-truncate Width150" ng-attr-title="{{sa.earlyStartView}}" ng-bind="showData && showData2 ? sa.earlyStartView  : \'\' "> \n                                            </td>\n                                            <td class="slds slds-truncate Width150" ng-attr-title="{{sa.dueDateView}}" ng-bind="showData && showData2 ? sa.dueDateView  : \'\' "> \n                                            </td>\n                                            <td class="slds slds-truncate Width100" ng-attr-title="{{sa.fields[\'WorkTypeId\'] ? workTypes[sa.fields[\'WorkTypeId\']] : \'\'}}">\n                                                <span class="">{{sa.fields[\'WorkTypeId\'] ? workTypes[sa.fields[\'WorkTypeId\']] : \'\'}}</span>\n                                            </td>\n                                            <td class="slds slds-truncate Width100" ng-attr-title="{{sa.accountName}}">\n                                                <span class="">{{showData && showData2 ? sa.accountName : \'\'}}</span>\n                                            </td>\n\n                                            <td class="slds slds-truncate Width100 " ng-attr-title="{{ skills[sa.parentRecord].join(\',\') }}" >\n                                            <span class=""> {{ showData && showData2 ? skills[sa.parentRecord].join(\',\') : \'\' }}</span>\n                                        </td>\n                                           \n                                        </tr>\n                                        </tbody>\n                                </table>\n                                \n                                \n                            </div>\n\n                             <p>\n                                <div>\n                                    <input ng-model="mode" id="createBundleMode" checked="checked" class="modeRadioButton" type="radio" ng-change="clearError()" value="NEW" ng-disabled="errorMode == 3"><label class="radioLables" for="createBundleMode">' + customLabels.CreateNewBundle + '</label></td>\n                                </div>    \n\n                                    <div class="newB">\n                                        <div class="selectBundler" ng-hide="isNativeMode == true">\n                                            <div><span class="required">*</span><span>Bundle Policy</span></div>\n                                            <div>\n                                                <input type="text" ng-class="errorMode == 1  ? \'error-field\' : \'\' " list="bundlerPolicyList" ng-change="clearError()" placeholder="' + customLabels.SelectBundlePolicyDrop + '" ng-model="selectedBundlePolicy"  title="{{bundlerPolicyNamesMapLookup[ selectedBundlePolicy ]}}" class="bundlerInput" ng-disabled="mode === \'UPDATE\' || errorMode == 3">\n                                                \n                                                <datalist id="bundlerPolicyList">\n                                                    <option ng-repeat="(key, value) in bundlerPolicyMap"  [key]="{{value}}">{{value}}</option>\n                                                </datalist>\n                                            </div>\n\n                                            <div ng-class="errorMode == 1 ? \'field-required-lable\' : \'error-hide\' ">' + customLabels.SelectAPolicy + '</div>\n\n                                        </div>\n                                    </div>\n                                <div>\n                                    <p>\n                                        <div>\n                                            <input ng-model="mode" id="updateBundleMode" class="modeRadioButton" type="radio" ng-change="clearError()" value="UPDATE" ng-disabled="errorMode == 3" ><label class="radioLables" for="updateBundleMode">' + customLabels.AddToExistingBundle + '</label> \n                                        </div>\n\n                                        <div class="updateB">\n                                            <div class="selectBundler">\n                                            <div><span class="required">*</span><span>' + customLabels.ExistingBundle + '</span></div>\n                                                <div>\n                                                    <input type="text" ng-class="errorMode == 2 ? \'error-field\' : \'\' " list="bundlerList" placeholder="' + customLabels.SelectBundle + '" title="{{existingBundler}}" ng-model="existingBundler" ng-change="clearError()" class="bundlerInput" ng-disabled="mode === \'NEW\' || errorMode == 3 ">\n                                                    \n                                                    <datalist id="bundlerList">\n                                                        <option ng-repeat="bundlerName in bundlers" value="{{bundlerName}}"/>\n                                                    </datalist>\n                                                </div>\n                                                <div ng-class="errorMode == 2 ? \'field-required-lable\' : \'error-hide\' ">' + customLabels.SelectAnExistingBundle + '</div>\n                                            </div>\n                                        </div>    \n                                    </p>\n                                </div>\n                                    \n                               \n                            </p>\n\n                        </div>\n\n                        <div class="lightboxControllers">\n\n                            <button class="btn cancelButton" ng-click="closeLightbox(false)">' + customLabels.CancelButton + '</button>\n                            <button class="btn apllyButton"  ng-click="apply()" ng-disabled="errorMode == 3" >' + customLabels.SaveButton + '</button> <!-- ng-disabled="nonSelected()"-->\n                        </div>\n\n                    </div>\n                </div>\n            ');
        }

        // This will be our factory
        return {
            open: open
        };
    }
})();