'use strict';

(function () {
    angular.module('SettingsApp', ['Highlight', 'UIDirectives', 'ngNomnoml', 'ui.bootstrap', 'ui.sortable']);
})();
'use strict';

(function () {

    angular.module('SettingsApp').filter('menuFilter', menuFilter);

    function menuFilter() {

        function filter(menuItems, pattern, level) {

            var filteredItems = [];

            if (!pattern || pattern.length < 2) {
                return menuItems;
            }

            menuItems.forEach(function (item) {
                if (item.title.toLowerCase().indexOf(pattern.toLowerCase()) > -1 || level !== 3 && isFound(item.items, pattern)) {
                    item.show = true;
                    filteredItems.push(item);
                }
            });

            return filteredItems;
        }

        function isFound(items, pattern) {

            var found = false;

            items.forEach(function (item) {
                if (item.title.toLowerCase().indexOf(pattern.toLowerCase()) > -1 || item.items && isFound(item.items, pattern)) {
                    found = true;
                    item.show = true;
                }
            });

            return found;
        }

        return filter;
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').controller('settingsCtrl', settingCtrl);

    settingCtrl.$inject = ['dataService', '$scope', 'settingsUtils'];

    function settingCtrl(dataService, $scope, settingsUtils) {
        var _this = this;

        // menu items, global object with labels
        this.menu = settings.menu;

        var optimizationProfileNames = ['Field Service Optimization', 'FSL Optimization'];

        // init
        this.searchPattern = null;
        this.selectedItem = settings.menu[0];
        this.selectedItemTab = { name: settings.menu[0].items[0].tabName };
        this.finishedLoadingSettings = dataService.finishedLoading;
        this.permissionsMissingShouldHide = optimizationProfileNames.includes(profile) || dataService.permissionsMissing();
        this.inactiveSBRemoteSites = isSandboxRemoteSiteActive();
        $scope.labelForSingularError = null;
        $scope.labelForPluralError = null;
        $scope.showSandboxAlertMsg = false;

        $scope.$on('PermissionsMissing', function (eve, data) {
            if (optimizationProfileNames.includes(profile)) {
                data.resolve();
            } else {
                _this.switchPageAndTab(eve, settings.menu[0], settings.menu[0].items[1]);
                data.reject();
            }
        });

        // switch main tab
        this.switchPage = function ($event, item, pageIndex) {
            if ($event && $event.stopPropagation) {
                $event.stopPropagation();
            }

            if (dataService.isDirty()) {
                if (!confirm('You have unsaved changes that will be lost. Are you sure you want to navigate away?')) {
                    return;
                } else {
                    dataService.setOriginal();
                }
            }

            if (item.service === "healthCheckService") {
                Visualforce.remoting.Manager.invokeAction(remoteActions.updateGeneralFSLHealthCount, function (result) {});
            }

            dataService.hideErrors();

            _this.selectedItem = item;
            _this.selectedItemTab.name = item.items[0].tabName;

            window.location.hash = encodeURI('#page=' + pageIndex + '&tab=0');
        };

        setDefaultTab.call(this, this.switchPage);

        // navigate to sub menu
        this.switchPageAndTab = function ($event, item, subItem, pageIndex, tabIndex, domId) {
            if ($event.stopPropagation) {
                $event.stopPropagation();
            }

            if (dataService.isDirty()) {
                if (!confirm('You have unsaved changes that will be lost. Are you sure you want to navigate away?')) {
                    return;
                } else {
                    dataService.setOriginal();
                }
            }

            dataService.hideErrors();

            _this.selectedItem = item;
            _this.selectedItemTab.name = subItem.tabName;

            window.location.hash = encodeURI('#page=' + pageIndex + '&tab=' + tabIndex);
        };

        function setDefaultTab(switchTab) {
            var _this2 = this;

            var sulamitIndex = location.href.indexOf('#'),
                page = 0,
                tab = 0;

            if (sulamitIndex === -1) {

                if (optimizationProfileNames.includes(profile)) {
                    page = 5;
                }

                window.location.hash = encodeURI('#page=' + page + '&tab=' + tab);
                sulamitIndex = location.href.indexOf('#');
            }

            var getParmeters = location.href.substr(sulamitIndex + 1).split('&');

            getParmeters.forEach(function (param) {
                var values = param.split('=');

                if (values[0] === 'page' && values[1] >= 0 && values[1] < settings.menu.length) {
                    _this2.selectedItem = settings.menu[values[1]];
                }

                if (values[0] === 'tab' && values[1] >= 0 && values[1] < _this2.selectedItem.items.length) {
                    _this2.selectedItemTab = { name: _this2.selectedItem.items[values[1]].tabName };
                }
            });

            if (optimizationProfileNames.includes(profile) && location.href.indexOf('result=') > -1) {
                switchTab.call(this, null, settings.menu[5], 5);
            }
        }

        function isSandboxRemoteSiteActive() {
            settingsUtils.callRemoteAction(remoteActions.isSandBoxAndOptimizationActive).then(function (result) {
                if (result == false) {
                    return [];
                } else {
                    var FSLRemoteSiteUrls = ["https://fsl-optimize-sb.cloud.clicksoftware.com", "https://fsl-gis-sb.cloud.clicksoftware.com"];
                    var dataStr = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:tooling.soap.sforce.com">' + '<soapenv:Header>' + '<urn:SessionHeader>' + '<urn:sessionId>' + sessionId + '</urn:sessionId>' + '</urn:SessionHeader>' + '</soapenv:Header>' + '<soapenv:Body>' + '<urn:query>' + '<urn:queryString>SELECT id, SiteName, EndpointUrl, isActive FROM RemoteSiteSetting where isActive = false </urn:queryString>' + '</urn:query>' + '</soapenv:Body>' + '</soapenv:Envelope>';

                    var baseUrl = window.location.origin;
                    var xmlhttp = new XMLHttpRequest();
                    xmlhttp.onreadystatechange = function (e) {
                        if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
                            var response = xmlhttp;
                            var res = response.responseXML.getElementsByTagName("sf:EndpointUrl");
                            var siteName = response.responseXML.getElementsByTagName("sf:SiteName");
                            var siteId = response.responseXML.getElementsByTagName("sf:Id");
                            var siteIsActive = response.responseXML.getElementsByTagName("sf:IsActive");
                            var inactiveRemoteSitesList = [];
                            for (var i = 0; i < res.length; i++) {
                                if (FSLRemoteSiteUrls.includes(res[i].innerHTML)) {
                                    inactiveRemoteSitesList.push(res[i].innerHTML);
                                }
                            }
                            if (inactiveRemoteSitesList.length == 1) {
                                $scope.labelForSingularError = 'The required remote site ' + inactiveRemoteSitesList[0] + ' isn\'t active.';
                                $scope.showSandboxAlertMsg = true;
                            } else if (inactiveRemoteSitesList.length == 2) {
                                $scope.labelForPluralError = 'The required remote sites ' + inactiveRemoteSitesList[0] + ' and ' + inactiveRemoteSitesList[1] + ' aren\'t active.';
                                $scope.showSandboxAlertMsg = true;
                            }

                            return inactiveRemoteSitesList;
                        }
                    };
                    xmlhttp.open('POST', baseUrl + '/services/Soap/T/44.0');
                    xmlhttp.setRequestHeader('Content-Type', 'text/xml');
                    xmlhttp.setRequestHeader('Access-Control-Allow-Origin', '*');
                    xmlhttp.setRequestHeader('SOAPAction', '""');
                    xmlhttp.send(dataStr);
                }
            });
        }
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('objectSharingStatusDirective', objectSharingStatusDirective);

    objectSharingStatusDirective.$inject = [];

    function objectSharingStatusDirective() {

        controllerFunction.$inject = ['$scope', '$q', 'settingsUtils'];

        function controllerFunction($scope, $q, settingsUtils) {

            $scope.sessionId = sessionId;
            $scope.isLoading = true;

            settingsUtils.callRemoteAction(remoteActions.checkObjectSharingStatus, [$scope.objectSharingProps.SharingObjectAPI]).then(function (result) {
                $scope.isLoading = false;
                $scope.Status = result;
                $scope.objectSharingProps.Status = result;
            }).catch(function (result) {
                $scope.isLoading = false;
                $scope.Status = 'ERROR';
                $scope.objectSharingProps.Status = 'ERROR';
            });

            $scope.getIcon = function (name) {
                return settings.icons[name];
            };
        }

        var template = '\n            <div class="sharingStatus">\n            \n                <div class="objectName">{{objectSharingProps.SharingObjectName}}</div>\n\n                <div ng-show="isLoading" class="sharingLoadingContainer">\n                    <img class="loadingImg" src={{getIcon(\'loading\')}} />\n                </div>\n\n                <div ng-show="Status == \'Public\' && isLoading == false">\n                    <i class="fa fa-exclamation-circle warningIcon" aria-hidden="true"></i>\n                </div>\n\n                <div ng-show="Status == \'Private\' && isLoading == false" class="checkmark">\n                    <div class="checkmark_circle_green"></div>\n                    <div class="checkmark_stem"></div>\n                    <div class="checkmark_kick"></div>\n                </div>\n\n                <div ng-show="Status == \'Public\' && isLoading == false" class="sharingPublic">\n                    Object Sharing is Public\n                </div>\n\n                <div ng-show="Status == \'Private\' && isLoading == false" class="sharingPrivate">\n                    Object Sharing is Private\n                </div>\n            </div>';

        return {
            restrict: 'E',
            scope: {
                objectSharingProps: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('pushTopicsCreatorDirective', pushTopicsCreatorDirective);

    pushTopicsCreatorDirective.$inject = [];

    function pushTopicsCreatorDirective() {

        controllerFunction.$inject = ['$scope', '$q', 'settingsUtils'];

        function controllerFunction($scope, $q, settingsUtils) {

            $scope.pushTopicsStatus = 'Validating';
            $scope.disableUpdateButton = true;
            $scope.errMsg = '';

            function validatePushTopics() {
                settingsUtils.callRemoteAction(remoteActions.validatePushTopics, [$scope.pushTopicsProps]).then(function (PushTopicsValidations) {

                    if (PushTopicsValidations == null) {
                        $scope.pushTopicsStatus = 'ERROR';
                    } else {

                        $scope.pushTopicsStatus = 'Validating';

                        for (var i in PushTopicsValidations) {
                            if (PushTopicsValidations[i].status == 'NotUpdated' || PushTopicsValidations[i].status == 'NotExist') {
                                $scope.pushTopicsStatus = 'NotUpdated';
                                $scope.disableUpdateButton = false;
                                break;
                            }
                        }

                        if ($scope.pushTopicsStatus == 'Validating') {
                            $scope.pushTopicsStatus = 'Updated';
                        }
                    }
                }).catch(function (error) {
                    $scope.pushTopicsStatus = 'ERROR';
                    console.log('Validating Push Topics Failed: ' + error);
                });
            }

            $scope.updatePushTopics = function () {
                if ($scope.disableUpdateButton == false) {
                    $scope.disableUpdateButton = true;
                    settingsUtils.callRemoteAction(remoteActions.updatePushTopics, [$scope.pushTopicsProps]).then(function (res) {
                        validatePushTopics();
                    }).catch(function (err) {
                        $scope.pushTopicsStatus = 'ERROR';
                        $scope.errMsg = err.message.split('Error Message:')[0];
                        console.log('Validating Push Topics Failed: ' + err.message);
                    });
                }
            };

            validatePushTopics();
        }

        var template = '\n            \n            <div class="setting-row-container">\n                <label class="select-label">\n                    <div ng-show="pushTopicsStatus == \'Validating\'" class="pushTopicsLabelValidating">{{buttonStateLabels.validate}}</div>\n                    <div ng-class="{pushTopicsUpdatedButtonDisable: disableUpdateButton, pushTopicsUpdatedButton: !disableUpdateButton}" ng-click="updatePushTopics()" ng-show="pushTopicsStatus == \'NotUpdated\'">{{buttonStateLabels.update}}</div>\n                    <div ng-show="pushTopicsStatus == \'Updated\'" class="pushTopicsLabelUpdated">{{buttonStateLabels.updated}}</div>\n                    <div ng-show="pushTopicsStatus == \'ERROR\'" class="pushTopicsLabelError">{{buttonStateLabels.failed}}\n                        <div class="push-topic-error">{{errMsg}}</div>\n                    </div>\n                    <tooltip>{{pushTopicsToolTip}}</tooltip>\n                </label>\n                <div class="select-container">\n                </div>\n            <div>\n\n\n            ';

        return {
            restrict: 'E',
            scope: {
                pushTopicsProps: '=',
                buttonStateLabels: '=',
                pushTopicsToolTip: '@'
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

      angular.module('SettingsApp').directive('sldsNoAccess', sldsNoAccess);

      function sldsNoAccess() {

            var template = '\n                <div class="slds-illustration slds-illustration_small">\n                    <svg class="slds-illustration__svg" viewBox="0 0 454 212" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"\n                         xmlns:xlink="http://www.w3.org/1999/xlink">\n                        <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">\n                            <g transform="translate(-70.000000, -95.000000)">\n                                <g>\n                                    <g transform="translate(124.500000, 222.000000)">\n                                        <g fill="#FFFFFF">\n                                            <path vector-effect="non-scaling-stroke"\n                                                  d="M18.9209988,1.95433401 L33.259296,51.443436 C33.5666778,52.5043744 32.9557995,53.613617 31.8948612,53.9209988 C31.7139843,53.9734036 31.5266126,54 31.3382972,54 L2.6617028,54 C1.5571333,54 0.661702805,53.1045695 0.661702805,52 C0.661702805,51.8116846 0.688299176,51.6243129 0.74070397,51.443436 L15.0790012,1.95433401 C15.386383,0.893395645 16.4956256,0.282517358 17.556564,0.589899164 C18.2152102,0.780726338 18.7301717,1.29568777 18.9209988,1.95433401 Z"></path>\n                                        </g>\n                                        <g class="slds-illustration__stroke-secondary" stroke-linecap="round" stroke-width="3">\n                                            <polygon vector-effect="non-scaling-stroke" stroke-linejoin="round"\n                                                     points="17 0.323943662 34 54 -1.81721305e-12 54"></polygon>\n                                            <path vector-effect="non-scaling-stroke"\n                                                  d="M17,4.6953125 C17,43.0456294 17,62.6471919 17,63.5 C17,62.6471919 17,43.0456294 17,4.6953125 Z"></path>\n                                            <path vector-effect="non-scaling-stroke"\n                                                  d="M17,29.3239437 C22.3333333,35.7851611 25,39.1184944 25,39.3239437 C25,39.1184944 22.3333333,35.7851611 17,29.3239437 Z"\n                                                  stroke-linejoin="round"\n                                                  transform="translate(21.000000, 34.323944) scale(-1, 1) translate(-21.000000, -34.323944) "></path>\n                                        </g>\n                                    </g>\n                                    <g transform="translate(145.000000, 194.000000)">\n                                        <g transform="translate(1.000000, 0.000000)" fill="#FFFFFF">\n                                            <path vector-effect="non-scaling-stroke"\n                                                  d="M25.6478873,0 L50.879042,84.4273253 C51.1953215,85.4856452 50.5937789,86.5999782 49.535459,86.9162577 C49.3496374,86.9717906 49.1567264,87 48.9627843,87 L2.33299037,87 C1.22842087,87 0.332990367,86.1045695 0.332990367,85 C0.332990367,84.8060578 0.361199757,84.6131469 0.416732643,84.4273253 L25.6478873,0 Z"></path>\n                                        </g>\n                                        <g class="slds-illustration__stroke-secondary" stroke-linecap="round" stroke-width="3">\n                                            <polygon vector-effect="non-scaling-stroke" stroke-linejoin="round"\n                                                     points="26.5 0 52.5 87 0.5 87"></polygon>\n                                            <path vector-effect="non-scaling-stroke"\n                                                  d="M26.5,2.58642578 C26.5,61.0261034 26.5,90.9972948 26.5,92.5 C26.5,90.9972948 26.5,61.0261034 26.5,2.58642578 Z"></path>\n                                            <path vector-effect="non-scaling-stroke"\n                                                  d="M15.6478873,42 C22.314554,49.078692 25.6478873,52.7453587 25.6478873,53 C25.6478873,52.7453587 22.314554,49.078692 15.6478873,42 Z"\n                                                  stroke-linejoin="round"></path>\n                                            <path vector-effect="non-scaling-stroke"\n                                                  d="M27.6478873,68 C36.9812207,57.078692 41.6478873,51.7453587 41.6478873,52 C41.6478873,51.7453587 36.9812207,57.078692 27.6478873,68 Z"\n                                                  stroke-linejoin="round"></path>\n                                        </g>\n                                    </g>\n                                    <g transform="translate(404.500000, 245.000000) scale(-1, 1) translate(-404.500000, -245.000000) translate(348.000000, 226.000000)"\n                                       class="slds-illustration__stroke-secondary" stroke-linecap="round" stroke-linejoin="round"\n                                       stroke-width="3">\n                                        <g>\n                                            <polyline vector-effect="non-scaling-stroke" points="0 38 47.5 0 80.5 26"></polyline>\n                                            <polyline vector-effect="non-scaling-stroke" points="71 17 80.5 9 113 36"></polyline>\n                                        </g>\n                                    </g>\n                                    <g transform="translate(72.000000, 262.500000)">\n                                        <path vector-effect="non-scaling-stroke"\n                                              d="M153.962142,26.4644491 C151.225735,20.0143094 144.944776,15.5029106 137.633892,15.5029106 C135.619663,15.5029106 133.683612,15.8453541 131.878328,16.4764392 C128.451481,11.1704266 122.567406,7.66985447 115.883789,7.66985447 C109.491267,7.66985447 103.830159,10.8721423 100.350851,15.7935668 C98.9589956,14.968161 97.3423157,14.4956341 95.6177606,14.4956341 C94.1083143,14.4956341 92.6815102,14.8576334 91.4157672,15.5014039 C87.9975328,6.58722215 79.5098304,0.275259875 69.5804557,0.275259875 C60.4632836,0.275259875 52.5615782,5.59684366 48.6837305,13.3681823 C46.3912034,12.266973 43.8314865,11.6515593 41.1312741,11.6515593 C32.4373504,11.6515593 25.1998844,18.0312998 23.6476214,26.4644491 L153.962142,26.4644491 Z"\n                                              class="slds-illustration__fill-secondary"></path>\n                                        <path vector-effect="non-scaling-stroke" d="M13,25 L143,25"\n                                              class="slds-illustration__stroke-secondary" stroke-width="3"\n                                              stroke-linecap="round"></path>\n                                        <path vector-effect="non-scaling-stroke" d="M0,25 L450,25"\n                                              class="slds-illustration__stroke-secondary" stroke-width="3"\n                                              stroke-linecap="round"></path>\n                                    </g>\n                                    <g transform="translate(344.000000, 247.000000)">\n                                        <g transform="translate(0.293436, 0.054545)">\n                                            <path vector-effect="non-scaling-stroke"\n                                                  d="M165.428708,41.9454545 L0.0995432562,41.9454545 C0.0336614956,41.2089487 0,40.4630069 0,39.7090909 C0,26.2132599 10.7866531,15.2727273 24.0926641,15.2727273 C27.7492016,15.2727273 31.215485,16.0989227 34.3199502,17.5772977 C39.5712028,7.14424616 50.271428,0 62.6175975,0 C76.0636257,0 87.5573893,8.47383452 92.1862485,20.441159 C93.9002755,19.5768947 95.8324059,19.0909091 97.8764479,19.0909091 C100.211783,19.0909091 102.401037,19.7252784 104.285841,20.8333889 C108.997403,14.2263569 116.663488,9.92727273 125.320028,9.92727273 C138.043441,9.92727273 148.627152,19.2146805 150.834755,31.4671412 C151.487388,31.3631046 152.156394,31.3090909 152.837838,31.3090909 C159.117096,31.3090909 164.340238,35.8953699 165.428708,41.9454545 Z"\n                                                  class="slds-illustration__fill-secondary"></path>\n                                            <path vector-effect="non-scaling-stroke" d="M32.7065637,40.4454545 L173.706564,40.4454545"\n                                                  class="slds-illustration__stroke-secondary" stroke-width="3"\n                                                  stroke-linecap="round"></path>\n                                        </g>\n                                    </g>\n                                    <g transform="translate(105.000000, 203.000000)">\n                                        <g transform="translate(106.000000, 0.000000)" fill="#FFFFFF">\n                                            <polygon vector-effect="non-scaling-stroke"\n                                                     points="121.5 48.5 158.5 48.5 158.5 34.5 47.5 34.5 47.5 48.5 93.5 48.5 93.5 69.5 121.5 69.5 121.5 48.5"></polygon>\n                                            <path vector-effect="non-scaling-stroke"\n                                                  d="M33.9882812,0.21875 C36.5611979,0.21875 70.6126302,0.21875 136.142578,0.21875 L152.384766,11.1132813 C155.083088,16.811292 155.656656,19.677503 154.105469,19.7119141 C152.554281,19.7463252 116.293865,17.6717809 45.3242187,13.4882812 C35.1940104,4.64192708 31.4153646,0.21875 33.9882812,0.21875 Z"></path>\n                                            <path vector-effect="non-scaling-stroke"\n                                                  d="M32.6708984,2.02246094 L21.5554199,0.374195518 L17.6036034,0.374195518 L5.77148437,7.90429688 C3.09089817,12.6737672 3.09089817,15.2284547 5.77148437,15.5683594 C8.45207058,15.9082641 16.1278518,14.3268839 28.7988281,10.8242188 L42.9921875,7.90429688 L41.0699892,5.68448183 L32.6708984,2.02246094 Z"></path>\n                                            <rect x="0" y="34" width="48" height="14"></rect>\n                                        </g>\n                                        <g transform="translate(106.000000, 5.000000)" class="slds-illustration__fill-secondary">\n                                            <polygon vector-effect="non-scaling-stroke"\n                                                     points="93.3109375 43.4566406 93.3109375 64.6722656 120.925 64.6722656 121.823047 44.1324219 158.5 43.4566406 158.5 97.5 48.5 97.5 48.5 43.6933594"></polygon>\n                                            <path vector-effect="non-scaling-stroke"\n                                                  d="M132.670898,7.66300119e-19 C125.172201,-2.55433373e-19 94.1907552,-2.55433373e-19 39.7265625,7.66300119e-19 L31.8183594,12.5058594 L29.7050781,28.2714844 L157.78125,28.2714844 L157.78125,15.4775391 C148.539714,5.15917969 140.169596,1.78803361e-18 132.670898,7.66300119e-19 Z"></path>\n                                            <path vector-effect="non-scaling-stroke"\n                                                  d="M37.8266602,0 C34.4632704,0 29.4181858,0 22.6914062,0 C16.1624349,0 9.53808594,3.83528646 2.81835938,11.5058594 L0.705078125,30.2714844 L48.4101562,30.2714844 L48.4101562,14.4775391 L48.1789909,12.3275853 C43.283405,4.10919509 39.832628,0 37.8266602,0 Z"></path>\n                                            <rect x="0.5" y="43.5" width="48" height="54"></rect>\n                                        </g>\n                                        <g>\n                                            <rect class="slds-illustration__stroke-primary" stroke-width="3" stroke-linecap="round"\n                                                  stroke-linejoin="round" x="154.5" y="34.5" width="110" height="68"></rect>\n                                            <polygon vector-effect="non-scaling-stroke" class="slds-illustration__stroke-primary"\n                                                     stroke-width="3" stroke-linecap="round" stroke-linejoin="round"\n                                                     points="264.5 48.5 264.5 34.5 154.5 34.5 154.5 48.5 199.5 48.5 199.5 69.5 227.5 69.5 227.5 48.5"></polygon>\n                                            <path vector-effect="non-scaling-stroke"\n                                                  d="M130.5,0.5 L234.5,0.5 C251.068542,0.5 264.5,13.9314575 264.5,30.5 L264.5,34.5 L106.5,34.5 L106.5,24.5 C106.5,11.245166 117.245166,0.5 130.5,0.5 Z"\n                                                  class="slds-illustration__stroke-primary"\n                                                  stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>\n                                            <path vector-effect="non-scaling-stroke"\n                                                  d="M130.5,0.5 L130.5,0.5 C143.754834,0.5 154.5,11.245166 154.5,24.5 L154.5,34.5 L106.5,34.5 L106.5,24.5 C106.5,11.245166 117.245166,0.5 130.5,0.5 Z"\n                                                  class="slds-illustration__stroke-primary"\n                                                  stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>\n                                            <rect class="slds-illustration__stroke-primary" stroke-width="3" stroke-linecap="round"\n                                                  stroke-linejoin="round" x="106.5" y="48.5" width="48" height="54"></rect>\n                                            <rect class="slds-illustration__stroke-primary" stroke-width="3" stroke-linecap="round"\n                                                  stroke-linejoin="round" x="106.5" y="34.5" width="48" height="14"></rect>\n                                            <path vector-effect="non-scaling-stroke"\n                                                  d="M219,52 C219,54.765 216.765,57 214,57 C211.235,57 209,54.765 209,52 C209,49.235 211.235,47 214,47 C216.765,47 219,49.235 219,52 Z"\n                                                  class="slds-illustration__fill-primary"></path>\n                                            <path vector-effect="non-scaling-stroke" d="M214,55 L214,60"\n                                                  class="slds-illustration__stroke-primary" stroke-width="4"\n                                                  stroke-linecap="round"></path>\n                                            <circle vector-effect="non-scaling-stroke" class="slds-illustration__fill-primary"\n                                                    cx="164" cy="58" r="3"></circle>\n                                            <circle vector-effect="non-scaling-stroke" class="slds-illustration__fill-primary"\n                                                    cx="164" cy="93" r="3"></circle>\n                                            <circle vector-effect="non-scaling-stroke" class="slds-illustration__fill-primary"\n                                                    cx="255" cy="58" r="3"></circle>\n                                            <circle vector-effect="non-scaling-stroke" class="slds-illustration__fill-primary"\n                                                    cx="255" cy="93" r="3"></circle>\n                                            <circle vector-effect="non-scaling-stroke" class="slds-illustration__fill-primary"\n                                                    cx="145" cy="58" r="3"></circle>\n                                            <circle vector-effect="non-scaling-stroke" class="slds-illustration__fill-primary"\n                                                    cx="145" cy="93" r="3"></circle>\n                                            <circle vector-effect="non-scaling-stroke" class="slds-illustration__fill-primary"\n                                                    cx="116" cy="58" r="3"></circle>\n                                            <circle vector-effect="non-scaling-stroke" class="slds-illustration__fill-primary"\n                                                    cx="116" cy="93" r="3"></circle>\n                                            <path vector-effect="non-scaling-stroke"\n                                                  d="M289.928751,82.2971422 L298,102.518658 L280,102.518658 L288.071249,82.2971422 C288.275982,81.784207 288.857768,81.5343604 289.370703,81.7390942 C289.625359,81.8407378 289.827108,82.0424867 289.928751,82.2971422 Z"\n                                                  class="slds-illustration__fill-primary"></path>\n                                            <path vector-effect="non-scaling-stroke"\n                                                  d="M300.428751,89.8132712 L305.5,102.518658 L293.5,102.518658 L298.571249,89.8132712 C298.775982,89.300336 299.357768,89.0504894 299.870703,89.2552232 C300.125359,89.3568668 300.327108,89.5586158 300.428751,89.8132712 Z"\n                                                  class="slds-illustration__fill-primary"></path>\n                                            <path vector-effect="non-scaling-stroke"\n                                                  d="M93.4287513,82.2971422 L101.5,102.518658 L83.5,102.518658 L91.5712487,82.2971422 C91.7759825,81.784207 92.3577681,81.5343604 92.8707033,81.7390942 C93.1253588,81.8407378 93.3271077,82.0424867 93.4287513,82.2971422 Z"\n                                                  class="slds-illustration__fill-primary"\n                                                  transform="translate(92.500000, 92.517446) scale(-1, 1) translate(-92.500000, -92.517446) "></path>\n                                            <path vector-effect="non-scaling-stroke"\n                                                  d="M76.9287513,89.8132712 L82,102.518658 L70,102.518658 L75.0712487,89.8132712 C75.2759825,89.300336 75.8577681,89.0504894 76.3707033,89.2552232 C76.6253588,89.3568668 76.8271077,89.5586158 76.9287513,89.8132712 Z"\n                                                  class="slds-illustration__fill-primary"\n                                                  transform="translate(76.000000, 96.275510) scale(-1, 1) translate(-76.000000, -96.275510) "></path>\n                                            <path vector-effect="non-scaling-stroke" d="M360,102.5 L372,102.5"\n                                                  class="slds-illustration__stroke-primary" stroke-width="3" stroke-linecap="round"\n                                                  stroke-linejoin="round"></path>\n                                            <path vector-effect="non-scaling-stroke" d="M0,102.5 L350,102.5"\n                                                  class="slds-illustration__stroke-primary" stroke-width="3" stroke-linecap="round"\n                                                  stroke-linejoin="round"></path>\n                                        </g>\n                                    </g>\n                                    <g transform="translate(150.000000, 96.000000)" class="slds-illustration__stroke-secondary"\n                                       stroke-linecap="round" stroke-width="3">\n                                        <path vector-effect="non-scaling-stroke"\n                                              d="M44,17.5 L63,17.5 C62.2789714,12.0723971 64.081543,7.53186978 68.4077148,3.87841797 C73.3754883,-0.195556641 79.2734375,0.717773438 82.440918,2.12353516 C85.6083984,3.52929687 87.9606934,5.46069336 89.5913086,9.10524041 C90.2822266,10.6397351 90.7517904,11.9379883 91,13"></path>\n                                        <path vector-effect="non-scaling-stroke"\n                                              d="M83,20.5 C84.0558268,16.8461914 86.2227376,14.4572754 89.5007324,13.333252 C94.4177246,11.6472168 99.0800781,13.8925781 100.942383,16.1518555 C102.804687,18.4111328 103.39502,20.2260742 103.746582,22.1201172 C103.980957,23.3828125 104.06543,24.8427734 104,26.5 C108.141764,26.3313802 110.918945,27.1647135 112.331543,29 C114.040039,31.1936035 114.215332,33.817627 113.593018,35.75 C112.970703,37.682373 110.894531,40.5 107,40.5 L28,40.5"></path>\n                                        <path vector-effect="non-scaling-stroke" d="M18,27.5 L83.0004985,27.5"></path>\n                                        <path vector-effect="non-scaling-stroke" d="M0,27.5 L8,27.5"></path>\n                                    </g>\n                                    <g transform="translate(271.000000, 135.000000)" class="slds-illustration__stroke-secondary"\n                                       stroke-linecap="round" stroke-width="3">\n                                        <g>\n                                            <path vector-effect="non-scaling-stroke"\n                                                  d="M44,17.5 L63,17.5 C62.2789714,12.0723971 64.081543,7.53186978 68.4077148,3.87841797 C73.3754883,-0.195556641 79.2734375,0.717773438 82.440918,2.12353516 C85.6083984,3.52929687 87.9606934,5.46069336 89.5913086,9.10524041 C90.2822266,10.6397351 90.7517904,11.9379883 91,13"></path>\n                                            <path vector-effect="non-scaling-stroke"\n                                                  d="M83,20.5 C84.0558268,16.8461914 86.2227376,14.4572754 89.5007324,13.333252 C94.4177246,11.6472168 99.0800781,13.8925781 100.942383,16.1518555 C102.804687,18.4111328 103.39502,20.2260742 103.746582,22.1201172 C103.980957,23.3828125 104.06543,24.8427734 104,26.5 C108.141764,26.3313802 110.918945,27.1647135 112.331543,29 C114.040039,31.1936035 114.215332,33.817627 113.593018,35.75 C112.970703,37.682373 110.894531,40.5 107,40.5 L28,40.5"></path>\n                                            <path vector-effect="non-scaling-stroke" d="M18,27.5 L83.0004985,27.5"></path>\n                                            <path vector-effect="non-scaling-stroke" d="M0,27.5 L8,27.5"></path>\n                                        </g>\n                                    </g>\n                                    <g transform="translate(402.000000, 164.000000)" class="slds-illustration__stroke-secondary"\n                                       stroke-linecap="round" stroke-width="3">\n                                        <g transform="translate(31.713442, 25.088326) rotate(-15.000000) translate(-31.713442, -25.088326) translate(4.713442, 6.588326)">\n                                            <path vector-effect="non-scaling-stroke"\n                                                  d="M31.0360707,3.43528591 C31.0360707,3.43528591 40.5802283,0.671893051 42.6488424,10.6908663"\n                                                  transform="translate(36.842457, 6.888440) rotate(41.000000) translate(-36.842457, -6.888440) "></path>\n                                            <path vector-effect="non-scaling-stroke"\n                                                  d="M40.4282002,10.1797377 C40.4282002,10.1797377 49.9723578,7.4163448 52.0409719,17.435318"\n                                                  transform="translate(46.234586, 13.632892) scale(-1, 1) rotate(-41.000000) translate(-46.234586, -13.632892) "></path>\n                                            <path vector-effect="non-scaling-stroke"\n                                                  d="M0.730284783,29.5865514 C0.730284783,29.5865514 10.2744424,26.8231586 12.3430565,36.8421318"></path>\n                                            <path vector-effect="non-scaling-stroke"\n                                                  d="M12.7302848,29.5865514 C12.7302848,29.5865514 22.2744424,26.8231586 24.3430565,36.8421318"\n                                                  transform="translate(18.536671, 33.039705) scale(-1, 1) translate(-18.536671, -33.039705) "></path>\n                                        </g>\n                                    </g>\n                                </g>\n                            </g>\n                        </g>\n                    </svg>\n                    <div class="slds-text-longform">\n                        <h3 class="slds-text-heading_medium">{{footerText}}</h3>\n                    </div>\n                </div>\n        ';

            return {
                  restrict: 'E',
                  scope: {
                        footerText: '@'
                  },
                  template: template
            };
      }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('automators', automators);

    automators.$inject = [];

    function automators() {

        controllerFunction.$inject = ['$scope', 'dataService', 'primitiveType', 'settingsUtils', '$q', '$timeout', '$rootScope'];

        function controllerFunction($scope, dataService, primitiveType, settingsUtils, $q, $timeout, $rootScope) {
            $scope.settings = dataService.getDraftSettings();
            $scope.primitiveType = primitiveType;

            $scope.labelField = fieldNames.Automator_Config__c.Label__c;

            $scope.checkedTerritories = {};
            $scope.searchTerritory = { Name: "" };
            $scope.usersCache = {};
            $scope.manyTerritories = dataService.getManyTerritories;
            $scope.manyTerritoriesAddedDraft = {};

            $scope.jobsTemplates = {
                'Sched008_TimePhaseSharing': {
                    Name: 'Sharing Automation',
                    Label__c: 'Sharing Automation',
                    Allow_Time_Span_Back__c: true,
                    Allow_Time_Horizon__c: true,
                    Allow_Filter_Field__c: false,
                    Enabled__c: true,
                    Time_Span_Backward__c: 7,
                    Time_Span_Forward__c: 7,
                    //Filter_Field__c: null,
                    Allow_No_Location__c: false,
                    Allow_Locations__c: true,
                    Allow_Scheduling_Policy__c: false,
                    Cron_Expression__c: '0 0 0 ? JAN,FEB,MAR,APR,MAY,JUN,JUL,AUG,SEP,OCT,NOV,DEC SUN,MON,TUE,WED,THU,FRI,SAT *'
                },
                'Sched009_STMIntegrityChecker': {
                    Name: 'Integrity Checker',
                    Label__c: 'Integrity Checker',
                    Allow_Time_Span_Back__c: false,
                    Allow_Time_Horizon__c: true,
                    Allow_Filter_Field__c: false,
                    Enabled__c: true,
                    //Time_Span_Backward__c: null,
                    Time_Span_Forward__c: 7,
                    //Filter_Field__c: null,
                    Allow_No_Location__c: false,
                    Allow_Locations__c: true,
                    Allow_Scheduling_Policy__c: true,
                    Cron_Expression__c: '0 0 0 ? JAN,FEB,MAR,APR,MAY,JUN,JUL,AUG,SEP,OCT,NOV,DEC SUN,MON,TUE,WED,THU,FRI,SAT *'
                },
                'Sched006_SLRPurge': {
                    Name: 'SLR Purge',
                    Label__c: 'SLR Purge',
                    Allow_Time_Span_Back__c: false,
                    Allow_Time_Horizon__c: false,
                    Allow_Filter_Field__c: false,
                    Enabled__c: true,
                    //Time_Span_Backward__c: null,
                    //Time_Span_Forward__c: null,
                    //Filter_Field__c: null,
                    Allow_No_Location__c: false,
                    Allow_Locations__c: false,
                    Allow_Scheduling_Policy__c: false,
                    Max_Objects_Count__c: 50000,
                    Cron_Expression__c: '0 0 0 ? JAN,FEB,MAR,APR,MAY,JUN,JUL,AUG,SEP,OCT,NOV,DEC SUN,MON,TUE,WED,THU,FRI,SAT *'
                },
                'Sched007_ServicesAppoDispatched': {
                    Name: 'Auto Dispatch',
                    Label__c: 'Auto Dispatch',
                    Allow_Time_Span_Back__c: false,
                    Allow_Time_Horizon__c: true,
                    Allow_Filter_Field__c: true,
                    Enabled__c: true,
                    //Time_Span_Backward__c: null,
                    Time_Span_Forward__c: 1,
                    //Filter_Field__c: null,
                    Allow_No_Location__c: true,
                    Allow_Locations__c: true,
                    Allow_Scheduling_Policy__c: false,
                    Cron_Expression__c: '0 0 0 ? JAN,FEB,MAR,APR,MAY,JUN,JUL,AUG,SEP,OCT,NOV,DEC SUN,MON,TUE,WED,THU,FRI,SAT *'
                },
                'Sched004_OAAS': {
                    Name: 'Optimization',
                    Label__c: 'Optimization',
                    Allow_Time_Span_Back__c: false,
                    Allow_Time_Horizon__c: true,
                    Allow_Filter_Field__c: true,
                    Enabled__c: true,
                    //Time_Span_Backward__c: null,
                    Time_Span_Forward__c: 7,
                    //Filter_Field__c: null,
                    Allow_No_Location__c: true,
                    Allow_Locations__c: true,
                    Allow_Scheduling_Policy__c: true,
                    One_Location_Mandatory__c: true,
                    Is_Decompose_Territories__c: false,
                    Decompose_Territories__c: 10,
                    Cron_Expression__c: '0 0 0 ? JAN,FEB,MAR,APR,MAY,JUN,JUL,AUG,SEP,OCT,NOV,DEC SUN,MON,TUE,WED,THU,FRI,SAT *'
                }
            };

            (function addNSToAutomatorTemplates() {

                for (var automatorTemplateName in $scope.jobsTemplates) {

                    var automator = $scope.jobsTemplates[automatorTemplateName];

                    for (var fieldName in automator) {
                        if (fieldName === 'Name') {
                            continue;
                        }

                        var fieldValue = automator[fieldName];
                        delete automator[fieldName];

                        automator[orgNameSpace + fieldName] = fieldValue;
                    }
                }
            })();

            createFormulaAndPoliciesOptionsArray();

            $rootScope.$on('savingForm', function () {
                $scope.editMode = false;
            });

            $scope.getIcon = function (name) {
                return window.settings.icons[name];
            };

            $scope.initTerritoryChecked = function (territory, automator) {

                var jobsStr = territory[fieldNames.ServiceTerritory.System_Jobs__c] || '',
                    jobs = jobsStr.split(';'),
                    automatorName = automator.Name.toLowerCase();

                this.checked = jobs.indexOf(automatorName) !== -1;
                $scope.checkedTerritories[automator[$scope.labelField]][territory.Id] = jobs.indexOf(automatorName) !== -1;
                this.$parent.numberOfTerritories++;
            };

            $scope.locationSelected = function (territory, automator, checked) {
                var checkForMaxTerritories = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;


                var checkedTerritories = $scope.checkedTerritories[automator.Name],
                    countTerritories = 0;

                for (var id in checkedTerritories) {
                    checkedTerritories[id] && countTerritories++;
                }

                // if (checkForMaxTerritories && countTerritories > window.maxTerritoriesPerAutomator) {
                //     $scope.checkedTerritories[automator.Name][territory.Id] = false;
                //     window.alert('You can not set more than ' + window.maxTerritoriesPerAutomator + ' service territories per automator');
                //     return;
                // }


                var jobsStr = territory[fieldNames.ServiceTerritory.System_Jobs__c] || '',
                    jobs = jobsStr.split(';'),
                    automatorName = automator.Name.toLowerCase();

                if (checked) {

                    if (jobs.indexOf(automatorName) === -1) {
                        jobs.push(automatorName);
                        this.$parent.numberOfTerritories++;
                    }
                } else {

                    var index = jobs.indexOf(automatorName);

                    if (index !== -1) {
                        jobs.splice(index, 1);
                        this.$parent.numberOfTerritories--;
                    }
                }

                territory[fieldNames.ServiceTerritory.System_Jobs__c] = jobs.join(';');

                automator.modifiedDeleteMeInCronExp = true;
            };

            $scope.selectAllTerritories = function (automator) {
                var selectType = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;


                var checkedTerritoriesCopy = angular.copy($scope.checkedTerritories[automator.Name]),
                    checkedTerritoried = $scope.checkedTerritories[automator.Name],
                    totalSelectedTerritories = 0,
                    nameFilter = $scope.searchTerritory[automator.Name] || "";

                if (automator[$scope.getAutomatorFieldName('Allow_No_Location__c')] && "NO TERRITORY".indexOf(nameFilter.toUpperCase()) > -1) {
                    if (automator[$scope.getAutomatorFieldName('One_Location_Mandatory__c')] || $scope.numberOfTerritories !== 0) {
                        automator[$scope.getAutomatorFieldName('No_Location__c')] = selectType;
                    }
                }

                $scope.settings.Territories.forEach(function (territory) {
                    if (automator[$scope.getAutomatorFieldName('Allow_Locations__c')] && territory.Name.toUpperCase().indexOf(nameFilter.toUpperCase()) > -1) {
                        $scope.checkedTerritories[automator[$scope.labelField]][territory.Id] = selectType;
                        $scope.locationSelected(territory, automator, selectType, false);
                    }
                });

                if (selectType) {
                    for (var id in checkedTerritoried) {
                        checkedTerritoried[id] && totalSelectedTerritories++;
                    }
                }

                // if (totalSelectedTerritories > window.maxTerritoriesPerAutomator) {
                //
                //     for (let id in checkedTerritoried) {
                //         checkedTerritoried[id] = checkedTerritoriesCopy[id];
                //     }
                //
                //     window.alert('You can not set more than ' + window.maxTerritoriesPerAutomator + ' service territories per automator');
                // }
            };

            $scope.isTerritoryFound = function (automator) {

                var nameFilter = $scope.searchTerritory[automator.Name] || "";

                if ("NO TERRITORY".indexOf(nameFilter.toUpperCase()) > -1) {
                    return true;
                }

                for (var i = 0; i < $scope.settings.Territories.length; i++) {
                    if ($scope.settings.Territories[i].Name.toUpperCase().indexOf(nameFilter.toUpperCase()) > -1) {
                        return true;
                    }
                }

                return false;
            };

            $scope.runNow = function (automator) {

                if ((this.currentAutomatorRunNowDone || this.currentAutomatorLoading || !this.automator.valid) && this.automator.valid !== undefined) {
                    return;
                }

                this.currentAutomatorLoading = true;

                delete automator.valid;

                var me = this;

                var modifiedAutomator = angular.copy(automator);
                delete modifiedAutomator.valid;

                settingsUtils.callRemoteAction(remoteActions.runJobNow, [modifiedAutomator]).then(function () {
                    me.currentAutomatorLoading = false;
                    me.currentAutomatorRunNowDone = true;
                    $timeout(function () {
                        me.currentAutomatorRunNowDone = false;
                    }, 4000);
                }).catch(function (res) {
                    me.currentAutomatorLoading = false;
                    window.alert('Error has occurred: ' + res.message);
                });
            };

            $scope.removeAutomator = function (automator) {

                for (var terr in $scope.settings.Territories) {
                    $scope.locationSelected($scope.settings.Territories[terr], automator, false);
                }

                $scope.objects.splice($scope.objects.indexOf(automator), 1);
                delete dataService.getDraftSettings().AutomatorConfig[automator.Name];

                if (automator.Id) dataService.getDraftSettings().DeletedAutomators.push(automator);

                dataService.setDirty();
            };

            $scope.newJobClicked = function () {

                $scope.currentNewAutomator = {
                    Name: 'Job name'
                };

                $scope.currentNewAutomator[fieldNames.Automator_Config__c.Class_Name__c] = $scope.classNames[0];

                $scope.automatorTypes = [];

                for (var i = 0; i < $scope.classNames.length; i++) {
                    $scope.automatorTypes.push({
                        label: $scope.jobsTemplates[$scope.classNames[i]][fieldNames.Automator_Config__c.Label__c],
                        value: $scope.classNames[i]
                    });

                    if ($scope.classNames[i] === $scope.currentNewAutomator[fieldNames.Automator_Config__c.Class_Name__c]) $scope.currentNewAutomator.Name = $scope.jobsTemplates[$scope.classNames[i]][fieldNames.Automator_Config__c.Label__c];
                }

                $scope.popUpOpen = true;
            };

            $scope.newAutomatorSaveButtonClicked = function () {
                if ($scope.checkIfAutomatorExists()) return;
                $scope.popUpOpen = false;
                var templateCopy = angular.copy($scope.jobsTemplates[$scope.currentNewAutomator[fieldNames.Automator_Config__c.Class_Name__c]]);
                angular.merge(templateCopy, $scope.currentNewAutomator);
                templateCopy[fieldNames.Automator_Config__c.Label__c] = $scope.currentNewAutomator.Name;
                $scope.objects.push(templateCopy);
                dataService.getDraftSettings().AutomatorConfig[templateCopy.Name] = templateCopy;
                dataService.setDirty();
            };

            $scope.newAutomatorCancelButtonClicked = function () {
                $scope.popUpOpen = false;
            };

            $scope.checkIfAutomatorExists = function () {

                for (var automatorName in $scope.settings.AutomatorConfig) {

                    if (automatorName.toLowerCase() === $scope.currentNewAutomator.Name.toLowerCase()) {
                        return true;
                    }
                }

                return false;
            };

            $scope.getAutomatorFieldName = function (field) {
                return window.fieldNames.Automator_Config__c[field];
            };

            function createFormulaAndPoliciesOptionsArray() {
                dataService.getSettingsPromise().then(function () {
                    $scope.formulaOptions = dataService.serviceBooleanFields;
                    $scope.policies = dataService.policies;
                });
            }

            $scope.searchUsers = function (inputValue) {

                var deferred = $q.defer();

                settingsUtils.callRemoteAction(remoteActions.searchUsers, [inputValue]).then(function (users) {
                    var userNames = [];

                    for (var i = 0; i < users.length; i++) {
                        userNames.push(users[i].Name);

                        // FSL-946
                        //$scope.usersCache[users[i].Name] = users[i].Username;
                        $scope.usersCache[users[i].Name] = users[i].Email;
                    }

                    deferred.resolve(userNames);
                });

                return deferred.promise;
            };

            $scope.filterInput = function (inputValue, automator) {
                var fromCache = $scope.usersCache[inputValue];

                if (!fromCache) {
                    fromCache = inputValue;
                }

                var currVal = automator[fieldNames.Automator_Config__c.Notification_Username__c];

                //if (currVal != undefined || fromCache != null) {
                if (currVal) {
                    automator[fieldNames.Automator_Config__c.Notification_Username__c] = fromCache;
                }

                return fromCache;
            };

            $scope.isDailyOptimizationPolicy = function (automator) {

                if (automator[fieldNames.Automator_Config__c.Allow_Scheduling_Policy__c] && dataService.isDailyOptimizationPolicy(automator[fieldNames.Automator_Config__c.Scheduling_Policy_Id__c])) {
                    return 'The selected scheduling policy uses In-Day Optimization, so only one day of the schedule is optimized.';
                } else {
                    return undefined;
                }
            };

            $scope.toggleAutomator = function (automator, config) {

                if (config.firstTimeOpen) {

                    // org has many territories + new automator
                    if (dataService.getManyTerritories() && automator.Id && !config.requestedLoadingTerritories) {

                        config.firstTimeLoading = true;
                        config.requestedLoadingTerritories = true;
                        config.currentlyLoadingTerritories = true;

                        dataService.getTerritoriesRelatedToAutomator(automator.Name).then(function (teritorries) {

                            config.firstTimeOpen = false;
                            config.open = true;
                            config.firstTimeLoading = false;
                            config.currentlyLoadingTerritories = false;

                            teritorries.forEach(function (t) {
                                $scope.selectedTerritoriesInLb[automator[$scope.labelField]][t.Id] = true;
                                $scope.savedSelectedTerritoriesInLb[automator[$scope.labelField]][t.Id] = true;
                            });
                        });
                    } else {
                        config.firstTimeOpen = false;
                        config.open = !config.open;
                    }

                    return;
                }

                config.open = !config.open;
            };

            $scope.getRelevantTerritories = function (automator) {

                if (!dataService.getManyTerritories()) {
                    return $scope.settings.Territories;
                }

                var territories = [],
                    idAlreadyPresent = {},
                    savedSelectedTerritories = $scope.savedSelectedTerritoriesInLb[automator[$scope.labelField]];

                for (var id in savedSelectedTerritories) {
                    !idAlreadyPresent[id] && savedSelectedTerritories[id] && dataService.getTerritories(id) && territories.push(dataService.getTerritories(id));
                    idAlreadyPresent[id] = true;
                }

                var newlyAddedTerritories = $scope.manyTerritoriesAddedDraft[automator.Name];

                if (newlyAddedTerritories && newlyAddedTerritories.size > 0) {
                    newlyAddedTerritories.forEach(function (t) {
                        !idAlreadyPresent[t.Id] && territories.push(t);
                        idAlreadyPresent[t.Id] = true;
                    });
                }

                return territories.sort(function (a, b) {
                    if (a.Name > b.Name) return 1;
                    if (a.Name < b.Name) return -1;
                    return 0;
                });
            };

            function isInTerritoryArray(array, id) {

                for (var i = 0; i < array.length; i++) {

                    if (array[i].Id === id) {
                        return true;
                    }
                }

                return false;
            }

            $scope.onTerritoriesWerePicked = function () {

                if ($scope.lastAutomatorOpened) {

                    var pickedTerritories = $scope.selectedTerritoriesInLb[$scope.lastAutomatorOpened[fieldNames.Automator_Config__c.Label__c]],
                        savedSelectedTerritoriesInLb = $scope.savedSelectedTerritoriesInLb[$scope.lastAutomatorOpened[fieldNames.Automator_Config__c.Label__c]],
                        territoriesToSave = dataService.getDraftSettings().Territories;

                    for (var id in pickedTerritories) {

                        savedSelectedTerritoriesInLb[id] = pickedTerritories[id];

                        $scope.locationSelected(dataService.getTerritories(id), $scope.lastAutomatorOpened, pickedTerritories[id]);

                        if (!isInTerritoryArray(territoriesToSave, id)) {
                            territoriesToSave.push(dataService.getTerritories(id));
                        }
                    }
                }

                $scope.lastAutomatorOpened = null;
            };

            $scope.closeTerritoriyPicker = function () {
                //console.log('cancel');
            };

            $scope.openTerritorySearchLightbox = function (automator) {
                $scope.lastAutomatorOpened = automator;
            };

            $scope.currentResults = [];
            $scope.cachedTerritoriesQueryResults = {};
            $scope.allTerritoriesQueried = {};
            $scope.territoriesIdsToNames = {};
            $scope.selectedTerritoriesInLb = {};
            $scope.savedSelectedTerritoriesInLb = {};
            $scope.currentlyLoading = false;

            $scope.searchTerritoryOnServer = function (searchText, automator) {

                // search is empty, mark "none" and validate
                if (searchText === "") {

                    $scope.manyTerritoriesAddedDraft[automator.Name] = $scope.manyTerritoriesAddedDraft[automator.Name] || new Set();

                    $scope.currentResults.forEach(function (territory) {

                        if ($scope.selectedTerritoriesInLb[automator.Name][territory.Id]) {
                            $scope.manyTerritoriesAddedDraft[automator.Name].add(territory);
                        }
                    });

                    $scope.currentResults = [];
                    $scope.showResults = false;
                    $scope.noTerritoriesFoundOnSearch = false;
                    return;
                }

                // check if cached
                if ($scope.cachedTerritoriesQueryResults[searchText.toLocaleLowerCase()]) {

                    $scope.currentResults = $scope.cachedTerritoriesQueryResults[searchText.toLocaleLowerCase()];
                    $scope.showResults = true;
                    $scope.noTerritoriesFoundOnSearch = $scope.currentResults.length === 0;

                    return;
                }

                $scope.currentlyLoading = true;

                // query from server
                window.Visualforce.remoting.Manager.invokeAction(window.remoteActions.searchTerritories, searchText, function (result, ev) {

                    if (ev.status) {

                        var allTerritories = dataService.getAllTerritories();
                        result.forEach(function (t) {
                            return allTerritories[t.Id] = allTerritories[t.Id] || t;
                        });

                        settingsUtils.safeApply($scope, function () {

                            // cache
                            $scope.cachedTerritoriesQueryResults[searchText.toLocaleLowerCase()] = result;
                            $scope.showResults = true;

                            // not synced with current value
                            // if ($scope.searchText !== searchText) {
                            //     return;
                            // }

                            $scope.currentlyLoading = false;
                            $scope.currentResults = result;

                            if (result.length === 0) {
                                $scope.noTerritoriesFoundOnSearch = true;
                            } else {
                                $scope.noTerritoriesFoundOnSearch = false;
                                result.forEach(function (t) {
                                    $scope.allTerritoriesQueried[t.Label] = t;
                                    $scope.territoriesIdsToNames[t.Id] = t.Label;
                                });
                            }
                        });
                    } else {

                        console.warn(ev);
                    }
                }, { buffer: true, escape: false, timeout: 120000 });
            };

            $scope.updateCurentlySelected = function (automator) {

                // CFSL1474
                $scope.manyTerritoriesAddedDraft[automator.Name] = $scope.manyTerritoriesAddedDraft[automator.Name] || new Set();

                $scope.currentResults.forEach(function (territory) {

                    if ($scope.selectedTerritoriesInLb[automator.Name][territory.Id]) {
                        $scope.manyTerritoriesAddedDraft[automator.Name].add(territory);
                    }
                });
            };

            $scope.selectTerritories = function (automator, all, automatorObj, searchOnServerValue) {

                // selected
                if (!searchOnServerValue) {

                    var displayedTerritories = $scope.getRelevantTerritories(automatorObj);

                    displayedTerritories.forEach(function (territory) {
                        $scope.selectedTerritoriesInLb[automator][territory.Id] = all;
                    });
                }

                // search results
                else {

                        $scope.currentResults.forEach(function (territory) {
                            $scope.selectedTerritoriesInLb[automator][territory.Id] = all;
                        });
                    }
            };
        }

        var template = '\n        <div class="automatorsWrapper" ng-if="!hideSection">\n                       \n            <div class="automatorButtonsWrapper" ng-hide="noChange">\n                <div class="newAutomator automatorButton settingsButton blueButton" ng-click="newJobClicked()">New job</div>\n                <div ng-show="objects.length > 0" class="editAutomators automatorButton settingsButton whiteButton" ng-click="editMode = !editMode">\n                    <span ng-if="!editMode">Edit</span>\n                    <span ng-if="editMode">Done</span>\n                </div>\n            </div>\n            <div class="noAutomators" ng-show="objects.length == 0">\n                No scheduled jobs\n            </div>\n            <div class="singleAutomator" \n                 ng-repeat="automator in objects | orderBy: getAutomatorFieldName(\'Name\') track by automator.Name" \n                 ng-class="{active: automator[getAutomatorFieldName(\'Enabled__c\')]}" \n                 ng-init="automatorConfig={open:false, firstTimeOpen: true, firstTimeLoading: false}; numberOfTerritories = 0; checkedTerritories[automator[labelField]] = {}; selectedTerritoriesInLb[automator[labelField]] = {}; savedSelectedTerritoriesInLb[automator[labelField]] = {};">\n                    \n                <div class="automatorRowAndContent" ng-class="{last: $last, selected: automatorConfig.open}">\n                    <div class="automatorRowContainer">\n                        <div class="automatorRow" ng-class="{automatorEditMode: editMode}">\n                            <div class="editErrorIcon" ng-click="editMode && removeAutomator(automator)">\n                                <svg aria-hidden="true" class="custom-slds-icon">\n                                    \u2028<use xlink:href="{{getIcon(\'remove\')}}"></use>\n                                \u2028</svg>\n                            </div>\n                            <span class="automatorTextAndCollapse">\n                            \n                                <img class="loading-automator-row" ng-show="automatorConfig.currentlyLoadingTerritories" src="' + window.settings.icons.spinner + '" />\n                               \n                            \n                                <span ng-click="toggleAutomator(automator, automatorConfig)">\n                                    <span class="collapseBox blueHover" ng-show="!automatorConfig.open">+</span>\n                                    <span class="collapseBox blueHover automatorConfig.openedCollapse" ng-show="automatorConfig.open">-</span>\n                                </span>\n                                <span ng-if="!editMode" class="automatorNameCont">\n                                    {{automator[getAutomatorFieldName(\'Label__c\')]}}\n                                </span>\n                                <span ng-if="editMode" class="automatorEditNameCont">\n                                    <custom-settings-wrapper primitive-type="primitiveType.text" label="" value-field-name="\'Label__c\'" setting="automator" class="automatorName"></custom-settings-wrapper>\n                                </span>\n                            </span>\n                        </div>\n                        <div class="runNowContainer">\n                        <span   class="runNow" ng-class="{disabled: (currentAutomatorRunNowDone || currentAutomatorLoading || !automator.valid) && automator.valid !== undefined}" \n                                ng-show="automator.Id && !currentAutomatorLoading && !currentAutomatorRunNowDone" \n                                ng-click="runNow(automator)">\n                            Run now\n                            </span>\n                            <svg class="automatorRunNowDone" ng-show="currentAutomatorRunNowDone" aria-hidden="true" class="slds-icon">\n                                \u2028<use xlink:href="{{getIcon(\'check\')}}"></use>\n                            \u2028</svg>\n                            <img class="automatorSmallLoading" ng-show="currentAutomatorLoading && !currentAutomatorRunNowDone" src={{getIcon(\'loading\')}} />\n                        </div>\n                    </div>\n                    <div class="automatorContent" ng-if="automatorConfig.open">\n                        <div class="automatorLeftContent">\n                            <div class="automatorContentSon">\n                                <checkbox label="\'Active\'" object="automator" value-field="\'Enabled__c\'" is-disabled="noChange"></checkbox>\n                                <div ng-show="noChange" class="active-purge">\n                                    When using SLR, the purge job cannot be modified or deactivated.\n                                </div>\n                                \n                                <div class="automatorHeader" ng-show="automator[getAutomatorFieldName(\'Allow_Locations__c\')] || automator[getAutomatorFieldName(\'Allow_No_Location__c\')]">Effective Territories</div>\n                                \n\n                                <div id="territorySelectionOptions" ng-show="!manyTerritories() && (automator[getAutomatorFieldName(\'Allow_Locations__c\')] || automator[getAutomatorFieldName(\'Allow_No_Location__c\')])">\n                                    <input placeholder="Search territories..." type="text" ng-model="searchTerritory[automator.Name]" />\n\n                                    <span ng-click="selectAllTerritories(automator)" title="Select All Filtered Territoried">All</span>\n                                    <span ng-click="selectAllTerritories(automator, false)" title="Unselect All Filtered Territoried">None</span>\n                                </div>\n                                    \n                                \n                                \n                                \n                                \n                              \n                               \n                                \n                                <div class="select-terr-auto" ng-show="manyTerritories()" ng-click="showTerritoryPicker = true; openTerritorySearchLightbox(automator)">Select Territories</div>\n                                \n                                \n                                <lightning-modal show="showTerritoryPicker" fixed-modal-height="true" header-text="Select Service Territories" save-text="Select" on-save="onTerritoriesWerePicked" on-close-cancel="closeTerritoriyPicker" cancel-text="Cancel" with-footer="true">\n                                    \n                                    <svg aria-hidden="true" class="slds-icon clear-terr-search-svg" ng-show="searchOnServerValue && !currentlyLoading" ng-click="searchOnServerValue = \'\'">\n                                        <use xlink:href="' + window.settings.icons.close + '"></use>\n                                    </svg>\n\n                                    <img class="searching-territory-spinner" src="' + window.settings.icons.spinner + '" ng-show="currentlyLoading" />\n\n                                    <input type="text" class="search-territory-input" ng-model="searchOnServerValue" ng-change="searchTerritoryOnServer(searchOnServerValue, automator)" ng-model-options="{debounce: 300}" placeholder="Search Service Territories" />\n                                    \n                                    <div class="select-all-territories-btn" ng-click="selectTerritories(automator[labelField], true, automator, searchOnServerValue)">Select All</div>\n                                    <div class="select-all-territories-btn" ng-click="selectTerritories(automator[labelField], false, automator, searchOnServerValue)">Select None</div>\n                                    \n                                    <div id="no-territories-found-on-server" ng-show="searchOnServerValue && currentResults.length == 0">\n                                        No Service Territories were found\n                                    </div>\n                                    \n                                    <div class="lightbox-territories-list" ng-show="searchOnServerValue && currentResults.length > 0">\n                                        <div ng-repeat="territory in currentResults track by territory.Id">\n                                            <input id="{{\'current_res_\' + territory.Id}}" type="checkbox" ng-model="$parent.selectedTerritoriesInLb[automator[labelField]][territory.Id]" ng-change="updateCurentlySelected(automator, $parent.selectedTerritoriesInLb[automator[labelField]][territory.Id])"/> \n                                            <label for="{{\'current_res_\' + territory.Id}}">{{territory.Name}}</label>\n                                        </div>\n                                    </div>\n                                    \n                                    \n                                    <div class="lightbox-territories-list" ng-hide="searchOnServerValue">\n                                        <div ng-show="automator[getAutomatorFieldName(\'Allow_Locations__c\')]" \n                                             ng-repeat="territory in getRelevantTerritories(automator) track by territory.Id">\n                                             \n                                                <div>\n                                                    <input id="{{\'loc\' + automator.Name + $index}}" type="checkbox" ng-model="$parent.selectedTerritoriesInLb[automator[labelField]][territory.Id]" /> \n                                                    <label for="{{\'loc\' + automator.Name + $index}}"> {{territory.Name}} </label>\n                                                </div>\n                                                \n                                        </div>\n                                    </div>\n                                    \n                                </lightning-modal>\n                                \n                                \n                                \n                                \n                                \n                                \n                                \n                                \n                                \n                                \n                                \n                                <div class="automatorLocationsList">\n                                    \n                                    <div ng-show="automator[getAutomatorFieldName(\'Allow_No_Location__c\')] && \'NO TERRITORY\'.indexOf(searchTerritory.toUpperCase()) > -1">\n                                        <input ng-disabled="automator[getAutomatorFieldName(\'One_Location_Mandatory__c\')] && numberOfTerritories == 0" id="{{automator.Name + \'noLocation\'}}" type="checkbox" ng-model="automator[getAutomatorFieldName(\'No_Location__c\')]"></input> <label for="{{automator.Name + \'noLocation\'}}">No territory</label>\n                                    </div>\n                                    \n                                    <div ng-show="automator[getAutomatorFieldName(\'Allow_Locations__c\')]" \n                                         ng-repeat="territory in getRelevantTerritories(automator) | filter:searchTerritory[automator.Name] track by territory.Id" \n                                         ng-init="initTerritoryChecked(territory, automator)">\n                                         \n                                            <div>\n                                                <input ng-hide="manyTerritories()" id="{{\'loc\' + automator.Name + $index}}" type="checkbox" ng-model="checkedTerritories[automator[labelField]][territory.Id]" ng-change="locationSelected(territory, automator, checkedTerritories[automator[labelField]][territory.Id])" /> \n                                                <label for="{{manyTerritories() ? \'\' : \'loc\' + automator.Name + $index}}"> {{territory.Name}} </label>\n                                            </div>\n                                            \n                                    </div>\n                                    \n\n                                    <div id="NoTerritoryFound" ng-show="!isTerritoryFound(automator)">\n                                        <input type="text" placeholder="Search Service Territories" ng-model="searchOnServerInput" />\n                                        \n                                        <div ng-show="searchOnServerInput">\n                                            search result\n                                        </div>\n                                        \n                                        <div ng-hide="searchOnServerInput">\n                                            <div ng-show="automator[getAutomatorFieldName(\'Allow_Locations__c\')]" \n                                                 ng-repeat="territory in getRelevantTerritories(automator) | filter:searchTerritory[automator.Name] track by territory.Id" \n                                                 ng-init="initTerritoryChecked(territory, automator)">\n                                                 \n                                                    <div>\n                                                        <input ng-hide="true" id="{{\'loc\' + automator.Name + $index}}" type="checkbox" ng-model="checkedTerritories[automator[labelField]][territory.Id]" ng-change="locationSelected(territory, automator, checkedTerritories[automator[labelField]][territory.Id])" /> \n                                                        <label for="{{\'loc\' + automator.Name + $index}}"> {{territory.Name}} </label>\n                                                    </div>\n                                                    \n                                            </div>\n                                        </div>\n                                        \n                                    </div>\n\n                                    \n                                </div>\n                                <checkbox label="\'Optimize in stages\'" ng-if="automator[getAutomatorFieldName(\'Class_Name__c\')] == \'Sched004_OAAS\'" object="automator" value-field="\'Is_Decompose_Territories__c\'"></checkbox>\n                                <custom-settings-wrapper ng-if="automator[getAutomatorFieldName(\'Is_Decompose_Territories__c\')] && automator[getAutomatorFieldName(\'Class_Name__c\')] == \'Sched004_OAAS\'" min="1" max="1000000000" primitive-type="primitiveType.number" label="\'Territories Per Stage\'" value-field-name="\'Decompose_Territories__c\'" setting="automator"></custom-settings-wrapper>\n                                <custom-settings-wrapper ng-if="automator[getAutomatorFieldName(\'Allow_Time_Span_Back__c\')]" min="1" max="30" primitive-type="primitiveType.number" label="\'Time Horizon in days (backwards)\'" value-field-name="\'Time_Span_Backward__c\'" setting="automator"></custom-settings-wrapper>\n                                <custom-settings-wrapper ng-if="automator[getAutomatorFieldName(\'Allow_Time_Horizon__c\')]" min="1" max="30" primitive-type="primitiveType.number" label="\'Time Horizon in days\'" value-field-name="\'Time_Span_Forward__c\'" setting="automator"></custom-settings-wrapper>\n                                <custom-settings-wrapper ng-if="automator[getAutomatorFieldName(\'Allow_Filter_Field__c\')]" options="formulaOptions" primitive-type="primitiveType.picklist" label="\'Filter by criteria\'" value-field-name="\'Filter_Field__c\'" setting="automator"></custom-settings-wrapper>\n\n                                <custom-settings-wrapper ng-if="automator[getAutomatorFieldName(\'Allow_Scheduling_Policy__c\')]" options="policies" primitive-type="primitiveType.picklist" label="\'Scheduling Policy\'" value-field-name="\'Scheduling_Policy_Id__c\'" setting="automator" tooltip-text="{{isDailyOptimizationPolicy(automator)}}"></custom-settings-wrapper>\n\n                                <custom-settings-wrapper ng-if="automator[getAutomatorFieldName(\'Class_Name__c\')] == \'Sched006_SLRPurge\'" primitive-type="primitiveType.number" min="0" max="1000000000" label="\'Max routes in cache\'" value-field-name="\'Max_Objects_Count__c\'" setting="automator"></custom-settings-wrapper>\n                                <custom-settings-wrapper filter-input="filterInput(inputValue, automator)" get-suggestions="searchUsers(inputValue)" primitive-type="primitiveType.autoComplete" label="\'Email recipient user name\'" value-field-name="\'Notification_Username__c\'" setting="automator" ng-hide="noChange"></custom-settings-wrapper>\n                            </div>\n                        </div>\n                        <div class="automatorRightContent">\n                            <div>\n                                <cron-exp automator="automator" expression="automator[getAutomatorFieldName(\'Cron_Expression__c\')]" valid="valid" is-disabled="noChange"></cron-exp>\n                            </div>\n                        </div>\n                    </div>\n                </div>\n            </div>\n            <pop-up ng-if="popUpOpen" on-cancel="newAutomatorCancelButtonClicked()" on-save="newAutomatorSaveButtonClicked()" ng-class="{disabledSave: checkIfAutomatorExists()}">\n                <main-content>\n                    <div class="automatorPopUpContent">\n                        <custom-settings-wrapper primitive-type="primitiveType.text" label="\'Name\'" maxlength="60" value-field-name="\'Name\'" setting="currentNewAutomator"></custom-settings-wrapper>\n                        <custom-settings-wrapper options="automatorTypes" primitive-type="primitiveType.picklist" label="\'Automator type\'" value-field-name="\'Class_Name__c\'" setting="currentNewAutomator"></custom-settings-wrapper>\n                        <div class="newAutomatorError" ng-if="checkIfAutomatorExists()">\n                            <ui-error>\n                                <main-content>\n                                    <div>There is already a scheduled job with this name</div>\n                                </main-content>\n                            </ui-error>\n                        </div>\n                    </div>\n                </main-content>\n            </pop-up>\n        </div>\n        ';

        return {
            restrict: 'E',
            scope: {
                objects: '=',
                classNames: '=',
                noChange: '=',
                hideSection: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('betaFeature', betaFeature);

    betaFeature.$inject = [];

    function betaFeature() {

        controllerFunction.$inject = ['$scope'];

        function controllerFunction($scope) {
            switch ($scope.text) {
                case 'New':
                    $scope.badgeClass = 'newFeature';
                    break;
                case 'Beta':
                    $scope.badgeClass = 'betaFeature';
                    break;
                default:
                    '';
            }
        }

        var template = '\n        <span class="{{badgeClass}}">\n            {{text}}\n        </span>';

        return {
            restrict: 'E',
            scope: {
                text: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

(function () {

    angular.module('SettingsApp').directive('bulkActionsOrder', bulkActionsOrder);

    function bulkActionsOrder() {

        controller.$inject = ['$scope', 'dataService'];

        function controller($scope, dataService) {

            $scope.$watch("object['Bulk Action Buttons Order']", function (newValue, oldValue) {
                if (newValue != oldValue) {
                    $scope.actionOrder = JSON.parse($scope.object['Bulk Action Buttons Order'][fieldNames.General_Config__c.Value__c]);
                    //console.log($scope.actionOrder);

                    $scope.unused = $scope.actionOrder.unused;
                    $scope.used = $scope.actionOrder.dropdown;
                    $scope.shown = [].concat(_toConsumableArray($scope.actionOrder.first), _toConsumableArray($scope.actionOrder.second));
                }
            });

            $scope.unusedCurrentlySelected = null;
            $scope.usedCurrentlySelected = null;

            function setNewObject() {

                dataService.setDirty();

                var first = [],
                    second = [];

                if ($scope.shown.length == 2) {
                    second = [$scope.shown[1]];
                    first = [$scope.shown[0]];
                }

                if ($scope.shown.length == 1) {
                    first = [$scope.shown[0]];
                }

                $scope.object['Bulk Action Buttons Order'][fieldNames.General_Config__c.Value__c] = JSON.stringify({
                    dropdown: $scope.used,
                    first: first,
                    second: second,
                    unused: $scope.unused
                });
            }

            $scope.moveHorizontally = function (fromArr, toArr, action, shownLength) {

                if (!action || shownLength && shownLength == 2) {
                    return;
                }

                var actionIndex = fromArr.indexOf(action);
                fromArr.splice(actionIndex, 1);
                toArr.push(action);

                $scope.unusedCurrentlySelected = null;
                $scope.usedCurrentlySelected = null;
                $scope.shownCurrentlySelected = null;

                setNewObject();
            };

            $scope.moveVertically = function (arr, action, up) {

                if (!action) {
                    return;
                }

                var actionIndex = arr.indexOf(action);

                if (up && actionIndex > 0) {
                    swap(arr, actionIndex, actionIndex - 1);
                }

                if (up === undefined && actionIndex != arr.length - 1) {
                    swap(arr, actionIndex, actionIndex + 1);
                }

                setNewObject();
            };

            function swap(arr, a, b) {
                var tmp = arr[a];
                arr[a] = arr[b];
                arr[b] = tmp;
            }
        }

        return {
            restrict: 'E',
            scope: {
                object: '='
            },
            controller: controller,
            template: '\n                        <div>Select the actions shown on the appointment list</div>\n                        <div class="setting-action-container"> \n                            \n                            \n                            <div class="bulkActionOrder">\n                                <div>Unused Actions</div>\n                                <div ng-repeat="action in unused track by $index" ng-click="$parent.unusedCurrentlySelected = action" ng-class="{\'optionselected\' : action === $parent.unusedCurrentlySelected}">{{action.title}}</div>\n                            </div> \n                            \n                            <div class="upDownContainer">\n                                <div class="arrowButtonContainer" ng-click="moveHorizontally(unused, used, unusedCurrentlySelected)">\n                                    <svg aria-hidden="true" class="custom-slds-icon">\n                                        <use xlink:href="' + settings.icons.right + '"></use>\n                                    </svg>\n                                </div> \n                                \n                                <div class="arrowButtonContainer" ng-click="moveHorizontally(used, unused, usedCurrentlySelected)">\n                                    <svg aria-hidden="true" class="custom-slds-icon">\n                                        <use xlink:href="' + settings.icons.left + '"></use>\n                                    </svg>\n                                </div>\n                            </div>\n                             \n                            \n                            <div class="bulkActionOrder usedActions">\n                                <div>Dropdown Actions</div>\n                                <div ng-repeat="action in used track by $index" ng-click="$parent.usedCurrentlySelected = action" ng-class="{\'optionselected\' : action === $parent.usedCurrentlySelected}">{{action.title}}</div>\n                            </div> \n                            \n                            <div class="upDownContainer">\n                                <div class="arrowButtonContainer" ng-click="moveVertically(used, usedCurrentlySelected, true)">\n                                    <svg aria-hidden="true" class="custom-slds-icon">\n                                        <use xlink:href="' + settings.icons.up + '"></use>\n                                    </svg>\n                                </div> \n                                \n                                <div class="arrowButtonContainer" ng-click="moveVertically(used, usedCurrentlySelected)">\n                                    <svg aria-hidden="true" class="custom-slds-icon">\n                                        <use xlink:href="' + settings.icons.down + '"></use>\n                                    </svg>\n                                </div>\n                                \n                                <div class="middle-arrows">\n                                    <div class="arrowButtonContainer" ng-click="moveHorizontally(used, shown, usedCurrentlySelected, shown.length)">\n                                        <svg aria-hidden="true" class="custom-slds-icon">\n                                            <use xlink:href="' + settings.icons.right + '"></use>\n                                        </svg>\n                                    </div> \n                                    \n                                    <div class="arrowButtonContainer" ng-click="moveHorizontally(shown, used, shownCurrentlySelected)">\n                                        <svg aria-hidden="true" class="custom-slds-icon">\n                                            <use xlink:href="' + settings.icons.left + '"></use>\n                                        </svg>\n                                    </div>\n                                </div>\n                            </div>\n                            \n                            \n                            \n                            \n                            <div class="bulkActionOrder usedActions">\n                                <div>Shown Actions</div>\n                                <div ng-repeat="action in shown track by $index" ng-click="$parent.shownCurrentlySelected = action" ng-class="{\'optionselected\' : action === $parent.shownCurrentlySelected}">{{action.title}}</div>\n                            </div> \n                            \n                            <div class="upDownContainer">\n                                <div class="arrowButtonContainer" ng-click="moveVertically(shown, shownCurrentlySelected, true)">\n                                    <svg aria-hidden="true" class="custom-slds-icon">\n                                        <use xlink:href="' + settings.icons.up + '"></use> \n                                    </svg>\n                                </div> \n                                \n                                <div class="arrowButtonContainer" ng-click="moveVertically(shown, shownCurrentlySelected)">\n                                    <svg aria-hidden="true" class="custom-slds-icon">\n                                        <use xlink:href="' + settings.icons.down + '"></use>\n                                    </svg>\n                                </div>\n                            </div>\n                        </div>'
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('checkbox', checkbox);

    checkbox.$inject = [];

    function checkbox() {

        controllerFunction.$inject = ['$scope'];

        function controllerFunction($scope) {
            $scope.valueWithNS = orgNameSpace + $scope.valueField;

            $scope.clickCheckbox = function () {
                if ($scope.isDisabled) return;

                $scope.object[$scope.valueWithNS] = !$scope.object[$scope.valueWithNS];
            };
        }

        var template = '\n        <div>\n            <span class="checkBoxWrapper" ng-click="clickCheckbox()" ng-class="{checked: object[valueWithNS], unchecked: !object[valueWithNS], checkboxDisabled: isDisabled}">\n                <span class="innerCheckboxValue" ng-class="{checked: object[valueWithNS], unchecked: !object[valueWithNS]}"></span>\n            </span>\n            <span class="checkboxLabel">{{label}}</span>\n        </div>';

        return {
            restrict: 'E',
            scope: {
                label: '=',
                valueField: '=',
                object: '=',
                isDisabled: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('clickOutside', ['$document', function ($document) {

        return {
            link: function postLink(scope, element, attrs) {
                var onClick = function onClick(event) {
                    var isChild = element[0].contains(event.target);
                    var isSelf = element[0] == event.target;
                    var isInside = isChild || isSelf;
                    if (!isInside) {
                        scope.$apply(attrs.clickOutside);
                    }
                };
                scope.$watch(attrs.isActive, function (newValue, oldValue) {
                    if (newValue !== oldValue && newValue == true) {
                        $document.bind('click', onClick);
                    } else if (newValue !== oldValue && newValue == false) {
                        $document.unbind('click', onClick);
                    }
                });
            }
        };
    }]);
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('collapseBox', collapseBox);

    function collapseBox() {

        controller.$inject = ['$scope'];

        function controller($scope) {

            $scope.toggleCollapse = function ($event, item) {
                $event.stopPropagation();
                item.show = !item.show;
            };
        }

        return {
            restrict: 'E',
            scope: {
                item: '='
            },
            controller: controller,
            template: '<span>\n                            <span class="collapseBox blueHover" ng-click="toggleCollapse($event, item)" ng-show="!item.show && item.items.length !== 0">+</span>\n                            <span class="collapseBox blueHover openedCollapse" ng-click="toggleCollapse($event, item)" ng-show="item.show && item.items.length !== 0">-</span>\n                            <span class="collapseBox blueHover hiddenCollapse" ng-show="item.items.length === 0"></span>\n                        </span>'
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('contentCollapseWrapper', contentCollapseWrapper);

    contentCollapseWrapper.$inject = [];

    function contentCollapseWrapper() {

        controllerFunction.$inject = ['$scope'];

        function controllerFunction($scope) {}

        var template = '\n            <div class="collapseWrapper">\n                <div class="collapseHeader" ng-click="open = !open">\n                    <i class="fa fa-plus-square-o" ng-show="!open"></i>\n                    <i class="fa fa-minus-square-o" ng-show="open"></i>\n                    {{header}}\n                </div>\n                <div ng-transclude="content" class="collapseContent" ng-show="open">\n                </div>\n            </div>\n        ';

        return {
            restrict: 'E',
            transclude: {
                content: 'content'
            },
            scope: {
                open: '=?bind',
                header: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('cronExp', cronExp);

    cronExp.$inject = ['dataService'];

    function cronExp(dataService) {

        function link(scope) {

            dataService.getSettingsPromise().then(function () {

                scope.userTimeZone = dataService.getDraftSettings().UserTimeZone;

                function getRangeArray(start, end) {

                    var arr = [];

                    for (var i = start; i <= end; i++) {
                        arr.push(i);
                    }

                    return arr;
                }

                scope.daysOfWeek = [{ label: 'Sun', value: 'SUN' }, { label: 'Mon', value: 'MON' }, { label: 'Tue', value: 'TUE' }, { label: 'Wed', value: 'WED' }, { label: 'Thu', value: 'THU' }, { label: 'Fri', value: 'FRI' }, { label: 'Sat', value: 'SAT' }];

                scope.months = [{ label: 'Jan', value: 'JAN' }, { label: 'Feb', value: 'FEB' }, { label: 'Mar', value: 'MAR' }, { label: 'Apr', value: 'APR' }, { label: 'May', value: 'MAY' }, { label: 'Jun', value: 'JUN' }, { label: 'Jul', value: 'JUL' }, { label: 'Aug', value: 'AUG' }, { label: 'Sep', value: 'SEP' }, { label: 'Oct', value: 'OCT' }, { label: 'Nov', value: 'NOV' }, { label: 'Dec', value: 'DEC' }];

                scope.minutesOptions = [15, 30];

                scope.daysOfMonth = getRangeArray(1, 31);
                scope.daysOfMonthWithLabel = [];

                for (var i = 0; i < scope.daysOfMonth.length; i++) {
                    scope.daysOfMonthWithLabel.push({
                        label: scope.daysOfMonth[i].toString(),
                        value: scope.daysOfMonth[i].toString()
                    });
                }

                scope.automatorRestriction = {
                    enabled: false,
                    startHour: "0",
                    endHour: "20"
                };

                scope.allHours = getRangeArray(0, 23);
                scope.allMinutes = getRangeArray(0, 59);
                scope.allYears = getRangeArray(new Date().getFullYear(), new Date().getFullYear() + 10);
                scope.id = Math.floor(Math.random() * 1000000 + 1);
                scope.selected = { months: [],
                    daysMonth: [],
                    daysWeek: []
                };

                scope.getFinishHoursForAutomator = function () {

                    var start = parseInt(scope.automatorRestriction.startHour),
                        end = parseInt(scope.automatorRestriction.endHour);

                    if (end < start + 1 && scope.automatorRestriction.endHour !== '0') {
                        scope.automatorRestriction.endHour = start === 23 ? '0' : (start + 1).toString();
                    }

                    var result = getRangeArray(start + 1, 23);

                    result.push(0);

                    return result;
                };

                scope.automator.valid = true;
                scope.modified = false;
                scope.timezoneField = fieldNames.Automator_Config__c.Timezone__c;
                scope.currentlySavedTimezone = scope.automator[scope.timezoneField];
                scope.inDayPolicyInUse = dataService.isDailyOptimizationPolicy(scope.automator[fieldNames.Automator_Config__c.Scheduling_Policy_Id__c]);

                scope.$watchCollection('automator', function (newAuto, oldAuto) {

                    scope.inDayPolicyInUse = !!dataService.isDailyOptimizationPolicy(newAuto[fieldNames.Automator_Config__c.Scheduling_Policy_Id__c]);

                    if (newAuto !== oldAuto) {

                        scope.modified = true;

                        if (newAuto.modifiedDeleteMeInCronExp) {
                            delete newAuto.modifiedDeleteMeInCronExp;
                        }

                        dataService.getModifiedAutomators()[scope.automator.Name] = true;
                        scope.automator[fieldNames.Automator_Config__c.Timezone__c] = scope.userTimeZone;

                        if (newAuto.LastModifiedDate !== oldAuto.LastModifiedDate) {
                            scope.currentlySavedTimezone = newAuto[scope.timezoneField];
                        }
                    }
                });

                scope.parseNumber = function (str) {

                    if (str) return parseInt(str);
                    return 0;
                };

                var setDefaultValues = function setDefaultValues(scope) {
                    scope.specificDate = moment().tz(scope.userTimeZone);
                    scope.recurringType = null;
                    scope.month = scope.months[0].value;
                    scope.year = scope.allYears[0];
                    scope.dayMonth = scope.daysOfMonth[0];
                    scope.hours = scope.allHours[14];
                    scope.minutes = scope.allMinutes[30];
                    scope.selected.months = [];
                    scope.recurringDay = 'dayWeek';
                    scope.selected.daysMonth = [];
                    scope.selected.daysWeek = [];
                    scope.recurringTime = 'specific';
                    scope.recurringTimeType = 'hours';
                    scope.recurringHours = scope.allHours[1];
                    scope.recurringMinutes = scope.minutesOptions[0];
                };

                var getParam = function getParam(param) {
                    return function (obj) {
                        return obj[param];
                    };
                };

                function setValues(scope, cronExpr) {

                    var savedCronExpr = cronExpr.split(' '),
                        hourBefore = savedCronExpr[2],
                        areHoursRestricted = hourBefore.indexOf('-') > -1,
                        repeatHours = null,
                        repeatEveryX = null,
                        repeatTypeIsHours = false;

                    if (areHoursRestricted) {

                        cronExpr = cronExpr.split(' ');

                        // recurring every X hours
                        if (hourBefore.indexOf('/') > -1) {
                            cronExpr[2] = hourBefore.substr(hourBefore.indexOf('/') + 1);
                            repeatEveryX = cronExpr[2];
                            repeatHours = hourBefore.substring(0, hourBefore.indexOf('/')).split('-');
                            repeatTypeIsHours = true;
                        }

                        // repeat every minute
                        else {

                                cronExpr[2] = 0;
                                repeatHours = hourBefore.split('-');
                                repeatEveryX = cronExpr[1].split('/')[1];
                            }

                        cronExpr = cronExpr.join(' ');
                    }

                    var regExps = {
                        'regExpOneTime': /^0\s([0-9]|([1-5][0-9]))\s([0-9]|(1[0-9])|(2[0-3]))\s([1-9]|([1-2][0-9])|3([0-1]))\s(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s\?\s([2-9][0-9][0-9][0-9])$/,
                        'recurringDayWeek': /^0\s((0\/([0-9]|([1-5][0-9])))|([0-9]|([1-5][0-9])))\s((0\/([1-9]|(1[0-9])|(2[0-3])))|([0-9]|(1[0-9])|(2[0-3])))\s\?\s(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(,FEB)?(,MAR)?(,APR)?(,MAY)?(,JUN)?(,JUL)?(,AUG)?(,SEP)?(,OCT)?(,NOV)?(,DEC)?\s(SUN|MON|TUE|WED|THU|FRI|SAT)(,SUN|,MON|,TUE|,WED|,THU|,FRI|,SAT)*\s\*$/,
                        'recurringDayMonth': /^0\s((0\/([0-9]|([1-5][0-9])))|([0-9]|([1-5][0-9])))\s((0\/([1-9]|(1[0-9])|(2[0-3])))|([0-9]|(1[0-9])|(2[0-3])))\s(1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31)(,1|,2|,3|,4|,5|,6|,7|,8|,9|,10|,11|,12|,13|,14|,15|,16|,17|,18|,19|,20|,21|,22|,23|,24|,25|,26|,27|,28|,29|,30|,31)*\s(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(,JAN|,FEB|,MAR|,APR|,MAY|,JUN|,JUL|,AUG|,SEP|,OCT|,NOV|,DEC)*\s\?\s\*$/
                    },
                        argsCron = cronExpr.split(' ');

                    var minutes = argsCron[1],
                        hours = argsCron[2];

                    if (regExps.regExpOneTime.test(cronExpr)) {

                        scope.recurringType = 'oneTime';
                        scope.minutes = scope.parseNumber(argsCron[1]);
                        scope.hours = scope.parseNumber(argsCron[2]);
                        scope.dayMonth = argsCron[3];
                        scope.month = argsCron[4];
                        scope.year = argsCron[6];
                    } else if (regExps.recurringDayWeek.test(cronExpr)) {

                        scope.recurringType = 'recurring';
                        scope.recurringDay = 'dayWeek';

                        if (areHoursRestricted) {

                            // set restriction
                            scope.automatorRestriction.enabled = true;
                            scope.automatorRestriction.startHour = repeatHours[0];
                            scope.automatorRestriction.endHour = repeatHours[1];

                            scope.recurringTime = 'recurring';

                            if (repeatTypeIsHours) {

                                scope.recurringTimeType = 'hours';
                                scope.recurringHours = parseInt(repeatEveryX);
                            } else {
                                scope.recurringTimeType = 'minutes';
                                scope.recurringMinutes = parseInt(repeatEveryX);
                            }
                        } else if (hours.indexOf('0/') === 0) {
                            scope.recurringHours = scope.parseNumber(hours.substring(2));
                            scope.recurringTime = 'recurring';
                            scope.recurringTimeType = 'hours';
                        } else if (minutes.indexOf('0/') === 0) {

                            scope.recurringMinutes = scope.parseNumber(minutes.substring(2));
                            scope.recurringTime = 'recurring';
                            scope.recurringTimeType = 'minutes';
                        } else {

                            scope.recurringTime = 'specific';
                            scope.hours = scope.parseNumber(hours);
                            scope.minutes = scope.parseNumber(minutes);
                        }

                        scope.selected.months = argsCron[4].split(',');
                        scope.selected.daysWeek = argsCron[5].split(',');
                    } else if (regExps.recurringDayMonth.test(cronExpr)) {

                        scope.recurringType = 'recurring';
                        scope.recurringDay = 'dayMonth';

                        if (repeatHours) {

                            // set restriction
                            scope.automatorRestriction.enabled = true;
                            scope.automatorRestriction.startHour = repeatHours[0];
                            scope.automatorRestriction.endHour = repeatHours[1];
                        }

                        if (hours.indexOf('0/') === 0) {

                            scope.recurringHours = scope.parseNumber(hours.substring(2));
                            scope.recurringTime = 'recurring';
                            scope.recurringTimeType = 'hours';
                        } else if (minutes.indexOf('0/') === 0) {

                            scope.recurringMinutes = scope.parseNumber(minutes.substring(2));
                            scope.recurringTime = 'recurring';
                            scope.recurringTimeType = 'minutes';
                        } else {

                            scope.recurringTime = 'specific';
                            scope.hours = scope.parseNumber(hours);
                        }

                        scope.selected.daysMonth = argsCron[3].split(',');
                        scope.selected.months = argsCron[4].split(',');
                    } else {
                        return false;
                    }

                    scope.specificDate.tz(scope.userTimeZone).set('years', scope.year);
                    scope.specificDate.tz(scope.userTimeZone).set('month', scope.months.map(getParam('value')).indexOf(scope.month));
                    scope.specificDate.tz(scope.userTimeZone).set('date', scope.dayMonth);

                    return true;
                }

                function joinElements(selectedElements) {
                    if (selectedElements === undefined || selectedElements.length === 0) {

                        scope.automator.valid = false;
                        return '*';
                    } else {
                        return selectedElements.join(",");
                    }
                }

                setDefaultValues(scope);

                if (scope.expression) {
                    setValues(scope, scope.expression);
                }

                scope.getCronExpr = function () {

                    try {

                        scope.automator.valid = true;

                        var expr = {
                            sec: "0",
                            min: "0",
                            hour: "0",
                            dayMonth: "*",
                            month: "*",
                            dayWeek: "?",
                            year: "*"
                        };

                        if (scope.recurringType === 'recurring') {

                            expr.month = joinElements(scope.selected.months, scope.months);

                            if (scope.recurringDay === 'dayWeek') {

                                expr.dayMonth = '?';
                                expr.dayWeek = joinElements(scope.selected.daysWeek);
                            } else {
                                expr.dayMonth = joinElements(scope.selected.daysMonth);
                            }

                            if (scope.recurringTime === 'specific') {

                                expr.hour = scope.hours;
                                expr.min = scope.minutes;
                            } else {

                                if (scope.recurringTimeType === 'hours') {
                                    expr.hour = '0/' + scope.recurringHours;
                                } else {
                                    expr.min = '0/' + scope.recurringMinutes;
                                }

                                if (scope.inDayPolicyInUse && scope.automatorRestriction.enabled) {

                                    expr.hour = scope.automatorRestriction.startHour + '-' + scope.automatorRestriction.endHour;

                                    if (scope.recurringTimeType === 'hours') {
                                        expr.hour += '/' + scope.recurringHours;
                                    }
                                }
                            }
                        } else if (scope.recurringType === 'oneTime') {

                            expr.hour = scope.hours;
                            expr.min = scope.minutes;
                            expr.month = scope.months[scope.specificDate.tz(scope.userTimeZone).get('month')].value;
                            expr.year = scope.specificDate.tz(scope.userTimeZone).get('year');
                            expr.dayMonth = scope.specificDate.tz(scope.userTimeZone).get('date');
                        } else {
                            scope.automator.valid = false;
                        }

                        var newExp = expr.sec + " " + expr.min + " " + expr.hour + " " + expr.dayMonth + " " + expr.month + " " + expr.dayWeek + " " + expr.year;

                        if (scope.expression !== newExp) {
                            scope.expression = newExp;
                            dataService.setDirty();
                        }

                        return scope.expression;
                    } catch (ex) {
                        scope.automator.valid = false;
                    }
                };

                // watch and always update cron string
                scope.$watch('recurringType', scope.getCronExpr);
                scope.$watch('recurringDay', scope.getCronExpr);
                scope.$watch('selected', scope.getCronExpr, true);
                scope.$watch('recurringTime', scope.getCronExpr);
                scope.$watch('recurringTimeType', scope.getCronExpr);
                scope.$watch('recurringHours', scope.getCronExpr);
                scope.$watch('recurringMinutes', scope.getCronExpr);
                scope.$watch('hours', scope.getCronExpr);
                scope.$watch('minutes', scope.getCronExpr);
                scope.$watch('specificDate', scope.getCronExpr);
                scope.$watch('automatorRestriction', scope.getCronExpr, true);
            });
        }

        return {
            restrict: 'E',
            scope: {
                expression: '=',
                valid: '=',
                automator: '=',
                isDisabled: '='
            },
            link: link,
            template: '\n                <div class="automatorFreq">\n                    <div class="cronHeader">Frequency</div>\n                    <div>\n                        <input id="{{automator.Name + \'oneTime\'}}" type="radio" ng-model="recurringType" value="oneTime" ng-disabled="isDisabled">\n                        <label for="{{automator.Name + \'oneTime\'}}">\n                        One Time\n                      </label>\n                      <input id="{{automator.Name + \'recurring\'}}" type="radio" ng-model="recurringType" value="recurring" ng-disabled="isDisabled">\n                      <label for="{{automator.Name + \'recurring\'}}">\n                        Recurring\n                      </label>\n                    </div>\n                </div>\n                <div class="automatorMonthAndDays" ng-show="recurringType == \'recurring\'">\n                    <div class="automatorMonth">\n                        <div class="cronHeader">Month</div>\n                        <cron-exp-rows-of-dates rows="months" selected-rows="selected.months" label-id-prefix="automator.Name + \'month\'" is-disabled="isDisabled"></cron-exp-rows-of-dates>\n                    </div>\n                    <div class="automatorDays">\n                        <div class="automatorWeekOrMonth">\n                            <label>\n                            <input type="radio" ng-model="recurringDay" value="dayWeek" ng-disabled="isDisabled">\n                            Day of week\n                          </label>\n                          <label>\n                            <input type="radio" ng-model="recurringDay" value="dayMonth" ng-disabled="isDisabled">\n                            Day of month\n                          </label>\n                        </div>\n                        <cron-exp-rows-of-dates ng-show="recurringDay == \'dayWeek\'" rows="daysOfWeek" selected-rows="selected.daysWeek" label-id-prefix="automator.Name + \'daysOfWeek\'" is-disabled="isDisabled"></cron-exp-rows-of-dates>\n                        <cron-exp-rows-of-dates ng-show="recurringDay == \'dayMonth\'" rows="daysOfMonthWithLabel" selected-rows="selected.daysMonth" label-id-prefix="automator.Name + \'daysOfMonth\'" is-disabled="isDisabled"></cron-exp-rows-of-dates>\n                    </div>\n                </div>\n                <div class="automatorHour">\n                    <div ng-show="recurringType == \'recurring\'" class="recurTime">\n                        <input ng-disabled="isDisabled" id="{{automator.Name + \'specificHour\'}}" type="radio" ng-model="recurringTime" value="specific">\n                        <label for="{{automator.Name + \'specificHour\'}}">\n                            Specific Hour\n                        </label>\n                      <input ng-disabled="isDisabled" id="{{automator.Name + \'recurHour\'}}" type="radio" ng-model="recurringTime" value="recurring">\n                      <label for="{{automator.Name + \'recurHour\'}}">\n                        Recurring Time\n                      </label>\n                    </div>\n                    <div class="automatorSpecificHour" ng-show="recurringTime == \'specific\' || recurringType == \'oneTime\'">\n                        <span class="automatorTimeSpan" ng-show="recurringType == \'oneTime\'">\n                            <span class="timeSpanHeader">\n                                Date\n                            </span>\n                            \n                            <span class="timeSpanInput">\n                                <input readonly ng-disabled="isDisabled" class="input-settings" fsl-date-picker my-model="specificDate" time-zone="userTimeZone" type="text"> </input>\n                            </span>\n                        </span>\n                        <span class="automatorTimeSpan">\n                            <span class="timeSpanHeader">\n                                Hour\n                            </span>\n                            \n                            <span class="timeSpanInput">\n                                <input ng-disabled="isDisabled" ng-model="hours" min="0" max="23" onkeydown = "return false;" type="number" class="input-settings">\n                            </span>\n                        </span>\n                        <span class="automatorTimeSpan">\n                            <span class="timeSpanHeader">\n                                Minute\n                            </span>\n\n                            <span class="timeSpanInput">\n                                <input ng-disabled="isDisabled" ng-model="minutes" min="0" max="55" step="5" type="number" onkeydown = "return false;" class="input-settings">\n                            </span>\n                        </span>\n                    </div>\n                    \n                    <div ng-show="recurringTime == \'recurring\' && recurringType == \'recurring\'" class="automatorRecur">\n                        \n                        Every\n\n                        <span ng-show="(recurringTimeType == \'hours\' && inDayPolicyInUse) || !inDayPolicyInUse">\n                            <input ng-disabled="isDisabled" class="input-settings cron-exp-recurring-input" min="1" max="23" onkeydown = "return false;" type="number" ng-model="recurringHours" />\n                        </span>\n\n                        <span ng-show="inDayPolicyInUse && recurringTimeType == \'minutes\'">\n                            <select ng-init="recurringMinutes" ng-model="recurringMinutes" class="select-setting cron-exp-recurring-select" ng-options="minutesOption for minutesOption in minutesOptions">\n                            </select>\n                        </span>\n\n                        <select ng-show="inDayPolicyInUse" ng-model="recurringTimeType" class="select-setting cron-exp-recurring-input">\n                            <option value="hours">Hours</option>\n                            <option value="minutes">Minutes</option>\n                        </select>\n\n                        <span ng-hide="inDayPolicyInUse">Hours</span>\n\n                        <tooltip ng-show="inDayPolicyInUse">You can set minute-based intervals for scheduling policies that support In-Day Optimization</tooltip>\n                        \n                       \n                        <div id="restrict-inday-policy" ng-show="inDayPolicyInUse">\n                        \n                            <input type="checkbox" ng-model="automatorRestriction.enabled" /> \n                            \n                            <span style="opacity:{{automatorRestriction.enabled ? 1 : 0.5}}">\n                            \n                                Restrict between \n                            \n                                <select class="select-setting cron-exp-recurring-input" ng-model="automatorRestriction.startHour" ng-disabled="!automatorRestriction.enabled">\n                                    <option ng-repeat="hour in allHours" value="{{hour}}">{{hour}}:00</option>\n                                </select>\n                                \n                                to\n                                \n                                <select class="select-setting cron-exp-recurring-input" ng-model="automatorRestriction.endHour" ng-disabled="!automatorRestriction.enabled">\n                                    <option ng-repeat="hour in allHours" value="{{hour}}">{{hour}}:00</option>\n                                </select>\n                                \n                                <span class="automator-next-day" ng-if="automatorRestriction.endHour === \'0\'">Not Including Midnight</span>\n                                \n                            </span>\n                            \n                        </div>\n\n                    </div>\n                    \n                    \n                    <div class="automator-tz-warning" ng-show="(!automator.Id || modified) && !automator[timezoneField]">\n                        The scheduled jobs configured here will be saved with the {{userTimeZone}} time zone to match your settings.\n                    </div>\n                    \n                    <div class="automator-tz-warning" ng-show="(!automator.Id || modified) && automator[timezoneField]">\n                        The scheduled jobs configured here will be saved with the {{userTimeZone}} time zone to match your settings. \n                        <span ng-show="currentlySavedTimezone">(They currently use the {{currentlySavedTimezone}} time zone.)</span>\n                    </div>\n                    \n                    <div style="margin-top: 15px" ng-show="!modified && automator[timezoneField]">\n                        This automator was saved with timezone: {{currentlySavedTimezone}} \n                    </div>\n                    \n                    \n                    <ui-error ng-if="automator.valid === false">\n                        <main-content>\n                            Please make sure this job has a valid frequency\n                        </main-content>\n                    </ui-error>\n                </div>\n            '
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('cronExpRowsOfDates', cronExpRowsOfDates);

    cronExpRowsOfDates.$inject = [];

    function cronExpRowsOfDates() {

        controllerFunction.$inject = ['$scope', 'dataService'];

        function controllerFunction($scope, dataService) {
            $scope.initRow = function (row) {
                this.selected = $scope.selectedRows.indexOf(row.value) != -1;
            };

            $scope.addOrRemoveItemFromArray = function (array, itemValue, add) {

                if (add) {
                    if (array.indexOf(itemValue) == -1) {
                        array.push(itemValue);
                    }
                } else {
                    var index = array.indexOf(itemValue);
                    if (index != -1) {
                        array.splice(index, 1);
                    }
                }

                $scope.selectedRows.sort(sortByBaseArray);

                function sortByBaseArray(obj1, obj2) {
                    var obj1Index = findObjByValue(obj1);
                    var obj2Index = findObjByValue(obj2);

                    return obj1Index - obj2Index;
                }

                function findObjByValue(val) {
                    for (var i = 0; i < $scope.rows.length; i++) {
                        if ($scope.rows[i].value == val) return i;
                    }

                    return -1;
                }

                dataService.setDirty();
            };
        }

        var template = '<div>\n                            <span class="automatorRowsOfDates" ng-repeat="row in rows">\n                                <input ng-change="addOrRemoveItemFromArray(selectedRows, row.value, selected)" id="{{labelIdPrefix + $index}}" type="checkbox" ng-model="selected" ng-disabled="isDisabled" ng-init="initRow(row)"> <label for="{{labelIdPrefix + $index}}">{{row.label}}</label>\n                            </span>\n                        </div>';

        return {
            restrict: 'E',
            scope: {
                rows: '=',
                selectedRows: '=',
                labelIdPrefix: '=',
                isDisabled: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('customSettingsWrapper', customSettingsWrapper);

    customSettingsWrapper.$inject = ['primitiveType'];

    function customSettingsWrapper(primitiveType) {

        controllerFunction.$inject = ['$scope', 'primitiveType', '$rootScope'];

        function controllerFunction($scope, primitiveType, $rootScope) {

            $scope.primitiveConst = primitiveType;

            $rootScope.$on('settingsUpdated', function () {
                init();
            });

            $scope.$watch('setting', function () {
                init();
            });

            $scope.$watch('options', function (newValue, oldValue) {
                if (JSON.stringify(newValue) != JSON.stringify(oldValue)) {
                    init();
                }
            });

            function init() {
                if (!$scope.setting) return;
                if ($scope.primitiveType == primitiveType.picklist && !$scope.options) return;

                var isCustomField = $scope.valueFieldName.indexOf('__c') != -1;
                var tempOrgNS = isCustomField ? orgNameSpace : '';

                var valueFieldName = tempOrgNS + $scope.valueFieldName;
                var label = null;
                var val = $scope.setting[valueFieldName];

                if ($scope.labelFieldName) {
                    label = $scope.setting[tempOrgNS + $scope.labelFieldName];
                } else label = $scope.label;

                switch ($scope.primitiveType) {
                    case primitiveType.boolean:
                        $scope.rawObject = new booleanDescriptor({
                            label: label,
                            value: val
                        });
                        break;
                    case primitiveType.text:
                        $scope.rawObject = new textDescriptor({
                            label: label,
                            value: val,
                            maxlength: $scope.maxlength
                        });
                        break;
                    case primitiveType.autoComplete:
                        $scope.rawObject = new textDescriptor({
                            label: label,
                            value: val,
                            maxlength: $scope.maxlength
                        });
                        break;
                    case primitiveType.number:
                        $scope.rawObject = new numberDescriptor({
                            label: label,
                            value: parseInt(val),
                            min: $scope.min,
                            max: $scope.max
                        });
                        break;
                    case primitiveType.picklist:
                        $scope.rawObject = new picklistDescriptor({
                            label: label,
                            value: val,
                            options: $scope.options
                        });
                        break;
                    case primitiveType.multi:

                        $scope.rawObject = new multiPicklistDescriptor({
                            label: label,
                            value: val,
                            options: $scope.options
                        });
                        break;
                    case primitiveType.booleanText:
                        $scope.rawObject = new booleanTextDescriptor({
                            label: label,
                            value: val
                        }, val == "1");
                        break;
                    default:
                        throw 'customSettingsWrapper - unknown primitive data type';
                }

                $scope.$watch('rawObject.value', function () {
                    var currVal = $scope.setting[valueFieldName];
                    var newVal = $scope.rawObject.value;

                    // don't put null instead of undefined, isdirty bugs
                    if (currVal == undefined && $scope.rawObject.value == null) {
                        return;
                    }

                    if ($scope.isText) {
                        newVal = newVal ? newVal.toString() : currVal;
                    }

                    $scope.setting[valueFieldName] = newVal;
                });

                $scope.mySuggestions = function (inputValue) {
                    return $scope.getSuggestions({ inputValue: inputValue });
                };

                $scope.myFilterInput = function (inputValue) {
                    return $scope.filterInput({ inputValue: inputValue });
                };

                $scope.onChange = function (val) {
                    if ($scope.change()) {
                        $scope.change()(val);
                    }
                };
            }
        }

        var template = '\n            <boolean-setting is-disabled="isDisabled" ng-if="primitiveType == primitiveConst.boolean" tooltip-text="{{ tooltipText }}" object="rawObject" learn-link="learnLink" is-beta="isBeta" change="onChange"></boolean-setting>\n            <text-setting ng-if="primitiveType == primitiveConst.text" tooltip-text="{{ tooltipText }}" object="rawObject"></text-setting>\n            <auto-complete filter-input="myFilterInput(inputValue)" get-suggestions="mySuggestions(inputValue)" ng-if="primitiveType == primitiveConst.autoComplete" tooltip-text="{{ tooltipText }}" object="rawObject"></auto-complete>\n            <number-setting ng-if="primitiveType == primitiveConst.number" tooltip-text="{{ tooltipText }}"  object="rawObject"></number-setting>\n            <picklist-setting is-disabled="isDisabled" ng-if="primitiveType == primitiveConst.picklist" tooltip-text="{{ tooltipText }}" object="rawObject" change="change()"></picklist-setting>\n            <multi-picklist-setting ng-if="primitiveType == primitiveConst.multi" object="rawObject" placeholder="placeholder"></multi-picklist-setting>\n            <boolean-text-setting is-disabled="isDisabled" ng-if="primitiveType == primitiveConst.booleanText" tooltip-text="{{ tooltipText }}" object="rawObject"></boolean-text-setting>\n        ';

        return {
            restrict: 'E',
            scope: {
                valueFieldName: '=',
                labelFieldName: '=',
                isBeta: '=',
                learnLink: '=',
                label: '=',
                primitiveType: '=',
                setting: '=',
                min: '=',
                max: '=',
                maxlength: '=',
                options: '=',
                placeholder: '=',
                isDisabled: '=',
                isText: '=',
                tooltipText: '@',
                getSuggestions: '&',
                filterInput: '&',
                change: '&'
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('formWithTabs', formWithTabs);

    formWithTabs.$inject = ['$compile', '$injector', '$rootScope'];

    function formWithTabs($compile, $injector, $rootScope) {

        function linkFunction($scope, element) {

            var tabsHtml = '';

            $scope.menuItem.items.forEach(function (item) {
                tabsHtml += '<div class="setting-form-container" ng-show="selectedTab.name == \'' + item.tabName + '\'">\n                        <' + item.directive + ' verify-functions="verifyFunctions"></' + item.directive + '>                       \n                    </div>';
            });

            var templateNew = template.replace('TABS_TEMPLATE_HERE', tabsHtml);
            element.html(templateNew);
            $compile(element.contents())($scope);
        }

        controllerFunction.$inject = ['$scope', '$injector', 'dataService', 'SAVING_STATES'];

        function controllerFunction($scope, $injector, dataService, SAVING_STATES) {

            $scope.verifyFunctions = [];
            $scope.foundErrors = false;
            $scope.switchTab = function (name, tabIndex) {
                $scope.selectedTab.name = name;
                window.location.hash = encodeURI(location.hash.substr(0, location.hash.lastIndexOf('tab')) + 'tab=' + tabIndex);
            };

            $scope.isSaving = dataService.isSaving;
            $scope.SAVING_STATES = SAVING_STATES;

            $scope.getErrors = dataService.getErrorFromServer;
            $scope.hideErrors = dataService.hideErrors;

            var formService = $injector.get($scope.menuItem.service);
            formService.loadData();

            $scope.save = function () {

                $scope.foundErrors = false;

                // run verify functions, if one returns true then we have error(s)
                $scope.verifyFunctions.forEach(function (f) {
                    return $scope.foundErrors = f() || $scope.foundErrors;
                });

                // have errors? don't run save
                if ($scope.foundErrors) {
                    return;
                }

                // run save function if all verifications pass
                var formService = $injector.get($scope.menuItem.service);
                formService.save();

                $rootScope.$broadcast('savingForm', {});
            };

            $scope.restore = function () {

                var shouldRestore = confirm('Are you sure you want to restore to defaults settings?');

                if (!shouldRestore) {
                    return;
                }

                $injector.get($scope.menuItem.service).restore();
            };
        }

        var template = '<div id="SettingContainer" ng-class="{\'form-with-footer\': !menuItem.hideFooter,\'form-without-footer\': menuItem.hideFooter}">\n                            <div class="settings-form">\n                                \n                                <div class="saving-error" ng-show="getErrors()">\n                                    {{ getErrors() }}\n                                    \n                                    <svg class="custom-slds-icon" ng-click="hideErrors()">\n                                        <use xlink:href="' + window.globalIcon + '/utility-sprite/svg/symbols.svg#close"></use>\n                                    </svg>\n                                </div>\n                                \n                                <div class="saving-banner" ng-show="isSaving() !== SAVING_STATES.NOT_SAVING" ng-class="{\'settings-saved\' : isSaving() == SAVING_STATES.SAVED}">\n                                    <span ng-show="isSaving() == SAVING_STATES.SAVING">Saving changes\u2026</span>\n                                    <span ng-show="isSaving() == SAVING_STATES.SAVED">Your changes were saved.</span>\n                                    <span ng-show="isSaving() == SAVING_STATES.RESTORING">Restoring default settings...</span>\n                                </div>\n                                \n                                <h1 ng-bind="menuItem.title"></h1>\n                                \n                                <div class="settings-tabs-container" ng-hide="menuItem.hideTabs"> \n                                    <div ng-repeat="tab in menuItem.items" \n                                         class="settings-tab" \n                                         ng-class="[ tab.dynamicClass, \'tab-setting-item\' ,{\'setting-active\': selectedTab.name == tab.tabName }]" \n                                         ng-click="switchTab(tab.tabName, $index)"\n                                         ng-bind="tab.title">\n                                    </div>     \n                                </div>\n                                \n                                TABS_TEMPLATE_HERE\n                                \n                                <div class="save-footer" ng-hide="menuItem.hideFooter">\n                                    <div class="save-button settingsButton blueButton" ng-click="save()">Save</div>\n                                    <div class="defaults-button settingsButton whiteButton" ng-click="restore()">Restore Defaults</div>\n                                </div>\n                            </div>\n                        </div>';

        return {
            restrict: 'E',
            controller: controllerFunction,
            link: linkFunction,
            scope: {
                selectedTab: '=',
                menuItem: '='
            },
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('Highlight', []).directive('highlight', highlight);

    function highlight() {

        function link(scope) {
            scope.domId = Math.random().toString().replace('.', '');
        }

        function controller($scope) {

            setTimeout(function () {
                return angular.element('#' + $scope.domId).html($scope.content);
            }, 10);

            // check for changes in the search pattern and generate new DOM
            $scope.$watch('search', function (newValue, oldValue) {

                if (newValue == oldValue) {
                    return;
                }

                if (!newValue) {
                    setTimeout(function () {
                        return angular.element('#' + $scope.domId).html($scope.content);
                    }, 10);
                    return;
                }

                var indexOf = $scope.content.toLowerCase().indexOf(newValue.toLowerCase());

                if (indexOf > -1) {

                    var matchedLength = newValue.length;

                    var domString = '' + $scope.content.substring(0, indexOf);
                    domString += '<span style="background: #' + $scope.color + '">' + $scope.content.substr(indexOf, matchedLength) + '</span>';
                    domString += '' + $scope.content.substring(matchedLength + indexOf);

                    setTimeout(function () {
                        return angular.element('#' + $scope.domId).html(domString);
                    }, 10);
                } else {
                    setTimeout(function () {
                        return angular.element('#' + $scope.domId).html($scope.content);
                    }, 10);
                }
            });
        }

        controller.$inject = ['$scope'];

        return {
            restrict: 'E',
            scope: {
                color: '@',
                content: '=',
                search: '='
            },
            link: link,
            controller: controller,
            template: '<span id="{{domId}}" />'
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('learnMoreLink', learnMoreLink);

    learnMoreLink.$inject = [];

    function learnMoreLink() {

        controllerFunction.$inject = ['$scope'];

        function controllerFunction($scope) {}

        var template = '\n            <a href="{{link}}" class="learnMore" target="_blank">Learn More...</a>\n        ';

        return {
            restrict: 'E',
            scope: {
                link: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('lightningModal', lightningModal);

    lightningModal.$inject = [];

    function lightningModal() {

        controllerFunction.$inject = ['$scope'];

        function controllerFunction($scope) {

            $scope.save = function () {

                $scope.show = !$scope.show;

                if ($scope.onSave()) {
                    $scope.onSave()();
                }
            };

            $scope.closeCancel = function () {

                $scope.show = !$scope.show;

                if ($scope.onCloseCancel()) {
                    $scope.onCloseCancel()();
                }
            };

            $scope.isLightning = function () {
                return sforce && sforce.one;
            };
        }

        var template = '<div style="max-height: 640px" ng-show="show">\n                            <section role="dialog" tabindex="-1" aria-labelledby="modal-heading-01" aria-modal="true" aria-describedby="modal-content-id-1" class="slds-modal slds-fade-in-open" ng-style="{ \'position\': isAbsolute ? \'absolute\' : \'fixed\' }">\n                                <div class="slds-modal__container"> \n                                \n                                    <header class="slds-modal__header">\n                                        <button class="slds-button slds-button_icon slds-modal__close slds-button_icon-inverse" ng-show="!closeCancel" title="Close" ng-click="closeCancel()">\n                                            <svg class="slds-button__icon slds-button__icon_large" aria-hidden="true">\n                                                <use xlink:href="' + settings.icons.close + '"/>\n                                            </svg>\n                                            <span class="slds-assistive-text">Close</span>\n                                        </button>\n                                        <h2 id="modal-heading-01" class="slds-text-heading_medium slds-hyphenate" ng-hide="!headerText">{{headerText}}</h2>\n                                    </header>\n                                    \n                                    <div class="slds-modal__content slds-p-around_medium" id="modal-content-id-1" ng-class="{\'modal-height\' : fixedModalHeight}">\n                                        <div ng-transclude></div>\n                                    </div>\n                                    \n                                    <footer class="slds-modal__footer" ng-show="withFooter">\n                                        <button class="slds-button slds-button_neutral" ng-hide="!cancelText" ng-click="closeCancel()">{{!cancelText ? \'Cancel\' : cancelText }}</button>\n                                        <button class="slds-button slds-button_brand" ng-hide="!saveText" ng-click="save()">{{!saveText ? \'Save\' : saveText }}</button>\n                                    </footer>\n                                </div>\n                            </section>\n                            <div class="slds-backdrop slds-backdrop_open"></div>\n                        </div>';

        return {
            restrict: 'E',
            transclude: true,
            scope: {
                fixedModalHeight: '=',
                isAbsolute: '=',
                cancelText: '@',
                saveText: '@',
                headerText: '@',
                show: '=',
                withFooter: '=',
                onCloseCancel: '&',
                onSave: '&'
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('popUp', popUp);

    popUp.$inject = ['$document'];

    function popUp($document) {

        function link($scope) {
            function keyupHandler(keyEvent) {
                if (keyEvent.which == 27) $scope.onCancel();else if (keyEvent.which == 13) $scope.onSave();

                $scope.$apply();
            }

            $document.on('keyup', keyupHandler);
            $scope.$on('$destroy', function () {
                $document.off('keyup', keyupHandler);
            });
        }

        var template = '\n        <div class="popUpOverlay">\n            <div class="settingsPopup">\n                <div class="popupHeader">\n                    <h2 class="ng-binding">New scheduled job</h2>\n                </div>\n                <div class="popupContent" ng-transclude="mainContent"></div>\n                <div class="popUpButtons">\n                    <div class="settingsButton popUpButton blueButton" ng-click="onSave()">Save</div>\n                    <div class="settingsButton popUpButton whiteButton" ng-click="onCancel()">Cancel</div>\n                </div>\n            </div>\n        </div>\n        ';

        return {
            restrict: 'E',
            scope: {
                onSave: '&',
                onCancel: '&'
            },
            link: link,
            transclude: {
                mainContent: 'mainContent'
            },
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('tooltip', function () {
        return {
            restrict: 'E',
            transclude: true,
            template: '<div class="helpIconSettingsShai">?</div><div class="tooltipBaloon"><ng-transclude></ng-transclude></div>'
        };
    });
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('member', function ($compile) {

        controllerFunction.$inject = ['$scope'];

        function controllerFunction($scope) {

            $scope.isFiltered = function () {
                return $scope.member.filter || !$scope.filterOn;
            };

            $scope.toggleCheckbox = function () {

                if ($scope.selected[$scope.member.Id]) {

                    if (!!$scope.member.children) {

                        var territories = [];

                        for (var i = 0; i < $scope.member.children.length; i++) {
                            territories.unshift($scope.member.children[i]);
                        }

                        while (territories.length > 0) {
                            var territory = territories.pop();

                            if (!!territory.children) {
                                for (var _i = 0; _i < territory.children.length; _i++) {
                                    territories.unshift(territory.children[_i]);
                                }
                            }

                            $scope.selected[territory.Id] = true;
                        }
                    }
                } else {

                    if (!!$scope.member.children) {

                        var _territories = [];

                        for (var _i2 = 0; _i2 < $scope.member.children.length; _i2++) {
                            _territories.unshift($scope.member.children[_i2]);
                        }

                        while (_territories.length > 0) {
                            var _territory = _territories.pop();

                            if (!!_territory.children) {
                                for (var _i3 = 0; _i3 < _territory.children.length; _i3++) {
                                    _territories.unshift(_territory.children[_i3]);
                                }
                            }

                            if (!!$scope.selected[_territory.Id]) {
                                delete $scope.selected[_territory.Id];
                            }
                        }
                    }

                    delete $scope.selected[$scope.member.Id];
                }
            };
        }

        return {
            controller: controllerFunction,
            restrict: "E",
            replace: true,
            scope: {
                member: '=',
                topLevelId: '=',
                parentId: '=',
                label: '=',
                selected: '=',
                filterOn: '='
            },
            template: '<li class="slds-nav-vertical__item" ng-show="isFiltered()">\n                            <div class="slds-tree__item" style="align-items: center">\n                                <button class="slds-button slds-button_icon slds-button_icon slds-m-right_x-small" ng-click="member.isOpen = !member.isOpen" ng-if="member.children && member.children.length > 0">\n                                    <i ng-class="{\'fa fa-angle-down\' : member.isOpen || isFiltered(), \'fa fa-angle-right\': !member.isOpen || isFiltered()}"/>\n                                </button>\n                                <div class="slds-checkbox">\n                                    <label class="slds-checkbox__label">\n                                        <input id="{{member.Id}}" type="checkbox" ng-change="toggleCheckbox()" ng-model="selected[member.Id]"/>\n                                        <span class="slds-checkbox_faux"></span>\n                                    </label>\n                                </div> \n                                <label class="slds-m-left--x-small" title="Tree Branch" for="{{member.Id}}">{{member[label]}}</label>\n                            </div>\n                        </li>',

            link: function link(scope, element, attrs) {
                if (angular.isArray(scope.member.children)) {
                    element.append('<collection class="slds-m-left_x-large" collection=\'member.children\' label="label" ng-if="member.children && member.children.length > 0" ng-show="member.isOpen && isFiltered()" selected="selected" top-level-id="topLevelId" parent-id="parentId" filter-on="filterOn"></collection>');
                    $compile(element.contents())(scope);
                }
            }
        };
    });

    angular.module('SettingsApp').directive('collection', function () {

        controllerFunction.$inject = ['$scope'];

        function controllerFunction($scope) {}

        return {
            controller: controllerFunction,
            restrict: "E",
            replace: true,
            scope: {
                collection: '=',
                label: '=',
                selected: '=',
                topLevelId: '=',
                parentId: '=',
                filterOn: '='
            },
            template: '<ul class="slds-tree">\n                         <member ng-repeat=\'member in collection\' member=\'member\' label="label" selected="selected" top-level-id="topLevelId" parent-id="parentId" filter-on="filterOn"></member>\n                       </ul>'
        };
    });
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('uiError', uiError);

    uiError.$inject = [];

    function uiError() {

        var template = '<div class="settingsError">\n                          <span ng-transclude="mainContent"></span>\n                        </div>';

        return {
            restrict: 'E',
            scope: {},
            link: function link(scope) {},
            transclude: {
                mainContent: 'mainContent'
            },
            template: template
        };
    }
})();
'use strict';

function Criteria(obj) {

    if (!obj) {
        this.Id = undefined;
        this.User_Type__c = [];
        this.Object_Type__c = undefined;
        this.Logic__c = { custom: { type: undefined, logic: undefined } };
        this.Criteria_Items__c = { custom: [], mandatory: { statusCategory: [] } };
        this.Territories__c = [];
        this.Work_Types__c = [];
        return;
    }

    this.Id = obj.Id;
    this.Object_Type__c = obj[fieldNames.Criteria__c.Object_Type__c];
    this.User_Type__c = obj[fieldNames.Criteria__c.User_Type__c] ? obj[fieldNames.Criteria__c.User_Type__c].split(';') : [];

    try {
        this.Logic__c = JSON.parse(obj[fieldNames.Criteria__c.Logic__c]);
    } catch (e) {
        this.Logic__c = { custom: { type: undefined, logic: undefined } };
    }

    try {
        this.Criteria_Items__c = JSON.parse(obj[fieldNames.Criteria__c.Criteria_Items__c]);
    } catch (e) {
        this.Criteria_Items__c = { custom: [], mandatory: { statusCategory: [] } };
    }

    try {

        this.Territories__c = JSON.parse(obj[fieldNames.Criteria__c.Territories__c]);

        if (!Array.isArray(this.Territories__c)) {
            this.Territories__c = [];
        }
    } catch (e) {
        this.Territories__c = [];
    }

    try {

        this.Work_Types__c = JSON.parse(obj[fieldNames.Criteria__c.Work_Types__c]);

        if (!Array.isArray(this.Work_Types__c)) {
            this.Work_Types__c = [];
        }
    } catch (e) {
        this.Work_Types__c = [];
    }
}

function CriteriaItem(index, field, operator, value) {
    this.field = field;
    this.operator = operator;
    this.value = value;
    this.index = index;
}
'use strict';

function ExpectedBehavior(description, serviceType) {

    this.description = description;
    this.serviceType = serviceType ? serviceType : OPTIMIZATION_TYPE_RDO;

    this.serviceConfig = {
        clearGantt: false,
        keepSameOrder: false
    };
}

var KEEP_SCHEDULE_1 = 'Try and keep the existing schedule while try to add more SA\'s';
var KEEP_SCEDULE_2 = 'Try and keep the existing schedule (move tasks to the right)';
var REORDER_DAY_BECAUSE_EMERGENCY = 'Reorganize the rest of the day after an Emergency was scheduling - while keeping minimum travel-time';

var OPTIMIZATION_TYPE_RSO = 'RSO';
var OPTIMIZATION_TYPE_RDO = 'RDO';
var OPTIMIZATION_TYPE_INDAY = 'IN_DAY';
var DISPATCH = '';
"use strict";

function ObjectMapping(name, label) {
    var sobject = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};


    for (var field in fieldNames.ObjectMapping__c) {
        this[fieldNames.ObjectMapping__c[field]] = sobject[fieldNames.ObjectMapping__c[field]] || null;
    }

    this.Id = sobject.Id || null;

    this.Name = name;
    this[fieldNames.ObjectMapping__c.label__c] = label;
    this.isOpen = false;
}
"use strict";

function SchedulingRecipe(obj) {

    if (!obj) {
        this.Id = undefined;
        this.Name = undefined;
        this.Semi_Automated__c = true;
        this.Active__c = false;
        this.Criteria__r = new Criteria();
        this.Expected_Behavior__c = undefined;
        this.Priority__c = undefined;
        this.Scenario_Specific__c = 10;
        this.Scenario_Type__c = undefined;
        this.Scheduling_Policy__c = undefined;
        this.Description__c = undefined;
        this.LKL_Threshold__c = 0;
        this.parsePostAction(undefined);
        return;
    }

    this.Id = obj.Id;
    this.Name = obj.Name;
    this.Semi_Automated__c = obj[fieldNames.SchedulingRecipe__c.Semi_Automated__c];
    this.Active__c = obj[fieldNames.SchedulingRecipe__c.Active__c];
    this.Criteria__r = new Criteria(obj[fieldNames.SchedulingRecipe__c.Criteria__r]);
    this.Expected_Behavior__c = obj[fieldNames.SchedulingRecipe__c.Expected_Behavior__c];
    this.Priority__c = obj[fieldNames.SchedulingRecipe__c.Priority__c];
    this.Scenario_Specific__c = obj[fieldNames.SchedulingRecipe__c.Scenario_Specific__c] ? obj[fieldNames.SchedulingRecipe__c.Scenario_Specific__c] : 10;
    this.Scenario_Type__c = obj[fieldNames.SchedulingRecipe__c.Scenario_Type__c];
    this.Scheduling_Policy__c = obj[fieldNames.SchedulingRecipe__c.Scheduling_Policy__c];
    this.Description__c = obj[fieldNames.SchedulingRecipe__c.Description__c];
    this.LKL_Threshold__c = obj[fieldNames.SchedulingRecipe__c.LKL_Threshold__c] ? obj[fieldNames.SchedulingRecipe__c.LKL_Threshold__c] : 0;
    this.parsePostAction(obj[fieldNames.SchedulingRecipe__c.Post_Actions__c]);
}

SchedulingRecipe.prototype.parsePostAction = function (actionString) {

    try {

        var parsedAction = JSON.parse(actionString);
        this.Post_Actions__c = {};
        this.Post_Actions__c.ScheduledSAs = parsedAction.ScheduledSAs ? parsedAction.ScheduledSAs : { keepSameStatus: true, Status: undefined };
        this.Post_Actions__c.UnscheduledSAs = parsedAction.UnscheduledSAs ? parsedAction.UnscheduledSAs : { PutInJepordy: false, InJepordyReason: undefined };
    } catch (e) {

        this.Post_Actions__c = {};
        this.Post_Actions__c.ScheduledSAs = { keepSameStatus: true, Status: undefined };
        this.Post_Actions__c.UnscheduledSAs = { PutInJepordy: false, InJepordyReason: undefined };
    }
};
"use strict";

function booleanDescriptor(sobject) {
    settingDescriptor.call(this, sobject);
}

booleanDescriptor.prototype = Object.create(settingDescriptor.prototype);
"use strict";

function booleanTextDescriptor(sobject, booleanValue) {
    settingDescriptor.call(this, sobject);

    this.booleanValue = booleanValue;
}

booleanTextDescriptor.prototype = Object.create(settingDescriptor.prototype);

booleanTextDescriptor.prototype.setValue = function () {
    this.value = this.booleanValue ? "1" : "0";
};
"use strict";

function multiPicklistDescriptor(sobject) {
    settingDescriptor.call(this, sobject);
    this.options = sobject.options;
    this.value = this.value;
}

multiPicklistDescriptor.prototype = Object.create(settingDescriptor.prototype);
"use strict";

function numberDescriptor(sobject, min, max) {
    settingDescriptor.call(this, sobject);

    this.min = sobject.min || min || 0;
    this.max = sobject.max || max || 0;
}

numberDescriptor.prototype = Object.create(settingDescriptor.prototype);
"use strict";

function picklistDescriptor(sobject) {
    settingDescriptor.call(this, sobject);
    this.options = sobject.options;
    this.value = this.value || this.options[0] && this.options[0].value || null;
}

picklistDescriptor.prototype = Object.create(settingDescriptor.prototype);
"use strict";

// pass sobject with value/label or directly add label/value

function picklistOption(sobjectOrLabel, value) {

    if (value) {
        this.label = sobjectOrLabel;
        this.value = value;
    } else {
        this.value = sobjectOrLabel.value;
        this.label = sobjectOrLabel.label;
    }
}
'use strict';

function settingDescriptor(sobject) {
    this.id = 'settingDescriptor' + (Math.random() * 10000000000000000).toString();
    this.label = sobject.label;
    this.value = sobject.value;
    this.dirty = false;
    this.customSettingType = sobject.type;
}
"use strict";

function textDescriptor(sobject, maxlength) {
    settingDescriptor.call(this, sobject);
    this.maxlength = sobject.maxlength || maxlength || null;
}

textDescriptor.prototype = Object.create(settingDescriptor.prototype);
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

(function () {

    angular.module('SettingsApp').service('dataService', dataService);

    dataService.$inject = ['settingsUtils', '$filter', '$timeout', 'SAVING_STATES', '$rootScope', '$q'];

    function dataService(settingsUtils, $filter, $timeout, SAVING_STATES, $rootScope, $q) {

        var problematicCSTransformedToArray = ['GeocodeSettings', 'AppointmentBookingSettings', 'DripFeedConfig', 'EmergencySettings', 'LogicSettings'];

        var lastFetchedSettings = null,
            draftSettings = {},
            settingsPromise = null,
            isSettingsDirty = false,
            saving = SAVING_STATES.NOT_SAVING,
            modifiedAutomators = {},
            dailyOptimizationPolicies = {},
            errorFromServer = null,
            finishedLoadingSettings = false,
            _permissionsMissing = false,
            manyTerritories = false,
            cahcedTerritoriesOnAutomator = {},
            territories = {};

        // get all settings object
        function getSettings() {
            var deferred = $q.defer();

            settingsUtils.callRemoteAction(remoteActions.getAllSettings, [], false).then(function (allSettingsObject) {

                for (var i = 0; i < problematicCSTransformedToArray.length; i++) {
                    transformArrayInObjectToSingle(allSettingsObject, problematicCSTransformedToArray[i]);
                }

                finishedLoadingSettings = true;
                manyTerritories = allSettingsObject.manyTerritories;

                moment.locale(allSettingsObject.UserLocale);
                lastFetchedSettings = allSettingsObject;
                angular.merge(draftSettings, allSettingsObject);

                createFormulaAndPoliciesOptionsArray();
                deferred.resolve();
            }).catch(function (res) {
                finishedLoadingSettings = true;
                _permissionsMissing = true;
                $rootScope.$broadcast('PermissionsMissing', deferred);
            });

            return deferred.promise;
        }

        function transformArrayInObjectToSingle(object, propertyName) {
            if (object[propertyName] && object[propertyName].length > 0) object[propertyName] = object[propertyName][0];else object[propertyName] = null;
        }

        function transformPropertyToArrayInObject(object, propertyName) {
            if (object[propertyName]) object[propertyName] = [object[propertyName]];else object[propertyName] = null;
        }

        function getSLRDirty() {
            return lastFetchedSettings && !angular.equals(draftSettings.LogicSettings[fieldNames.Logic_Settings__c.Use_SLR__c], lastFetchedSettings.LogicSettings[fieldNames.Logic_Settings__c.Use_SLR__c]);
        }

        function setOriginal() {
            angular.copy(lastFetchedSettings, draftSettings);
            isSettingsDirty = false;
            $rootScope.$broadcast('settingsUpdated');
        }

        function createFormulaAndPoliciesOptionsArray() {
            service.serviceBooleanFields = [];
            for (var formulaApiName in draftSettings.ServiceCheckboxFields) {
                service.serviceBooleanFields.push({
                    value: formulaApiName,
                    label: draftSettings.ServiceCheckboxFields[formulaApiName]
                });
            }

            service.serviceBooleanFields = $filter('orderBy')(service.serviceBooleanFields, 'label');
            service.serviceBooleanFields.unshift({
                value: null,
                label: 'None'
            });

            service.woBooleanFields = [];
            for (var _formulaApiName in draftSettings.WoCheckboxFields) {
                service.woBooleanFields.push({
                    value: _formulaApiName,
                    label: draftSettings.WoCheckboxFields[_formulaApiName]
                });
            }

            service.woBooleanFields = $filter('orderBy')(service.woBooleanFields, 'label');
            service.woBooleanFields.unshift({
                value: null,
                label: 'None'
            });

            service.woliBooleanFields = [];
            for (var _formulaApiName2 in draftSettings.WoliCheckboxFields) {
                service.woliBooleanFields.push({
                    value: _formulaApiName2,
                    label: draftSettings.WoliCheckboxFields[_formulaApiName2]
                });
            }

            service.woliBooleanFields = $filter('orderBy')(service.woliBooleanFields, 'label');
            service.woliBooleanFields.unshift({
                value: null,
                label: 'None'
            });

            service.policies = [];

            for (var i = 0; i < draftSettings.Policies.length; i++) {
                service.policies.push({
                    value: draftSettings.Policies[i].Id,
                    label: draftSettings.Policies[i].Name
                });

                if (draftSettings.Policies[i][fieldNames.Scheduling_Policy__c.Daily_Optimization__c]) {
                    dailyOptimizationPolicies[draftSettings.Policies[i].Id] = true;
                }
            }

            service.operatingHours = [];
            for (var _i = 0; _i < draftSettings.OperatingHours.length; _i++) {
                service.operatingHours.push({
                    value: draftSettings.OperatingHours[_i].Id,
                    label: draftSettings.OperatingHours[_i].Name
                });
            }

            service.serviceDateFields = [];
            service.serviceDoubleFields = [];
            service.serviceIntegerFields = [];
            service.serviceStringFields = [];

            for (var _formulaApiName3 in draftSettings.ServiceDateFields) {
                service.serviceDateFields.push({
                    value: _formulaApiName3,
                    label: draftSettings.ServiceDateFields[_formulaApiName3]
                });
            }

            for (var _formulaApiName4 in draftSettings.ServiceDoubleFields) {
                service.serviceDoubleFields.push({
                    value: _formulaApiName4,
                    label: draftSettings.ServiceDoubleFields[_formulaApiName4]
                });
            }

            for (var _formulaApiName5 in draftSettings.ServiceIntegerFields) {
                service.serviceIntegerFields.push({
                    value: _formulaApiName5,
                    label: draftSettings.ServiceIntegerFields[_formulaApiName5]
                });
            }

            for (var _formulaApiName6 in draftSettings.ServiceStringFields) {
                service.serviceStringFields.push({
                    value: _formulaApiName6,
                    label: draftSettings.ServiceStringFields[_formulaApiName6]
                });
            }

            service.resourceCheckboxFields = [];
            service.resourceDateFields = [];
            service.resourceDoubleFields = [];
            service.resourceIntegerFields = [];
            service.resourceStringFields = [];

            for (var _formulaApiName7 in draftSettings.ResourceCheckboxFields) {
                service.resourceCheckboxFields.push({
                    value: _formulaApiName7,
                    label: draftSettings.ResourceCheckboxFields[_formulaApiName7]
                });
            }

            for (var _formulaApiName8 in draftSettings.ResourceDateFields) {
                service.resourceDateFields.push({
                    value: _formulaApiName8,
                    label: draftSettings.ResourceDateFields[_formulaApiName8]
                });
            }

            for (var _formulaApiName9 in draftSettings.ResourceDoubleFields) {
                service.resourceDoubleFields.push({
                    value: _formulaApiName9,
                    label: draftSettings.ResourceDoubleFields[_formulaApiName9]
                });
            }

            for (var _formulaApiName10 in draftSettings.ResourceIntegerFields) {
                service.resourceIntegerFields.push({
                    value: _formulaApiName10,
                    label: draftSettings.ResourceIntegerFields[_formulaApiName10]
                });
            }

            for (var _formulaApiName11 in draftSettings.ResourceStringFields) {
                service.resourceStringFields.push({
                    value: _formulaApiName11,
                    label: draftSettings.ResourceStringFields[_formulaApiName11]
                });
            }

            service.woNumberFields = [];
            service.woliNumberFields = [];
            service.saNumberFields = [];

            for (var _formulaApiName12 in draftSettings.WoNumberFields) {
                service.woNumberFields.push({
                    value: _formulaApiName12,
                    label: draftSettings.WoNumberFields[_formulaApiName12]
                });
            }

            service.woNumberFields.unshift({
                value: null,
                label: 'None'
            });

            for (var _formulaApiName13 in draftSettings.WoliNumberFields) {
                service.woliNumberFields.push({
                    value: _formulaApiName13,
                    label: draftSettings.WoliNumberFields[_formulaApiName13]
                });
            }

            service.woliNumberFields.unshift({
                value: null,
                label: 'None'
            });

            for (var _formulaApiName14 in draftSettings.SaNumberFields) {
                service.saNumberFields.push({
                    value: _formulaApiName14,
                    label: draftSettings.SaNumberFields[_formulaApiName14]
                });
            }

            service.saNumberFields.unshift({
                value: null,
                label: 'None'
            });
        }

        function saveSettings(settings) {

            // don't allow double saving
            if (saving === SAVING_STATES.SAVING /*|| !isSettingsDirty*/) {
                    return;
                }

            settings = angular.copy(settings);
            errorFromServer = null;

            // validate automators - FSL-2269/2324
            var invalidAutomator = false;

            for (var key in settings.AutomatorConfig) {
                if (settings.AutomatorConfig[key].valid === false) {
                    invalidAutomator = true;
                } else {
                    delete settings.AutomatorConfig[key].valid;
                }
            }

            if (invalidAutomator) {
                alert('You have invalid automators set. Please fix them upon saving.');
                return;
            }

            var SystemJobsFieldName = fieldNames.ServiceTerritory.System_Jobs__c;

            // check for max number of territories per automator
            if (settings.AutomatorConfig) {
                var _ret = function () {

                    var territoriesInAutomator = {};

                    var _loop = function _loop(automatorName) {

                        territoriesInAutomator[automatorName] = territoriesInAutomator[automatorName] === undefined ? 0 : territoriesInAutomator[automatorName];

                        settings.Territories.forEach(function (territory) {
                            if (territory[SystemJobsFieldName]) {

                                var automatorsAssignedToTerritory = territory[SystemJobsFieldName].split(';'),
                                    foundAutomator = false;

                                for (var i = 0; i < automatorsAssignedToTerritory.length; i++) {
                                    if (automatorsAssignedToTerritory[i] === automatorName.toLowerCase()) {
                                        foundAutomator = true;
                                        break;
                                    }
                                }

                                foundAutomator && territoriesInAutomator[automatorName]++;
                            }
                        });
                    };

                    for (var automatorName in settings.AutomatorConfig) {
                        _loop(automatorName);
                    }

                    var automatorsWithManyTerritories = [];

                    for (var name in territoriesInAutomator) {

                        if (territoriesInAutomator[name] > window.maxTerritoriesPerAutomator) {
                            automatorsWithManyTerritories.push(name);
                        }
                    }

                    if (automatorsWithManyTerritories.length > 0) {
                        alert('The following system jobs have exceeded the number of allowed territories: ' + automatorsWithManyTerritories.join(', '));
                        return {
                            v: void 0
                        };
                    }
                }();

                if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
            }

            // convert numbers to strings
            if (settings.GeneralConfig) {
                for (var _key in settings.GeneralConfig) {
                    if (angular.isNumber(settings.GeneralConfig[_key][fieldNames.General_Config__c.Value__c])) {
                        settings.GeneralConfig[_key].Value__c = settings.GeneralConfig[_key][fieldNames.General_Config__c.Value__c].toString();
                    }
                }
            }

            for (var i = 0; i < problematicCSTransformedToArray.length; i++) {
                transformPropertyToArrayInObject(settings, problematicCSTransformedToArray[i]);
            }

            saving = SAVING_STATES.SAVING;
            document.getElementById('SettingsForm').scrollTop = 0;

            // Send only territories that were modified
            if (settings.Territories && !settings.manyTerritories) {
                settings.Territories = settings.Territories.filter(function (territory, i) {
                    return territory[SystemJobsFieldName] !== lastFetchedSettings.Territories[i][SystemJobsFieldName];
                });
            }

            if (settings.DeletedAutomators) {
                settings.DeletedAutomators.forEach(function (a) {
                    delete a.modifiedDeleteMeInCronExp;
                    delete a.valid;
                });
            }

            // FSL-2264
            if (settings.AutomatorConfig && Object.keys(settings.AutomatorConfig).length === 0) {
                delete settings.AutomatorConfig;
            }

            return settingsUtils.callRemoteAction(remoteActions.saveSettings, [settings]).then(function (updatedSettings) {

                for (var _i2 = 0; _i2 < problematicCSTransformedToArray.length; _i2++) {
                    transformArrayInObjectToSingle(updatedSettings, problematicCSTransformedToArray[_i2]);
                }

                saving = SAVING_STATES.SAVED;
                isSettingsDirty = false;

                // update settings objects
                lastFetchedSettings = updatedSettings;
                angular.copy(updatedSettings, draftSettings);
                draftSettings.DeletedAutomators.length = 0;
                // console.log(updatedSettings);

                // all modified automators were saved and not modified till next time
                for (var k in modifiedAutomators) {
                    modifiedAutomators[k] = false;
                }

                $rootScope.$broadcast('settingsUpdated');
            }).catch(function (ex) {

                errorFromServer = ex.message;
                console.error('Error saving');
                saving = SAVING_STATES.NOT_SAVING;
            }).finally(function () {

                if (!errorFromServer) {
                    $timeout(function () {
                        return saving = SAVING_STATES.NOT_SAVING;
                    }, 3500);
                }
            });
        }

        function restoreDefaultSettings(settings) {

            // don't allow double saving
            if (saving === SAVING_STATES.SAVING || saving === SAVING_STATES.RESTORING) {
                return;
            }

            settings = angular.copy(settings);

            for (var i = 0; i < problematicCSTransformedToArray.length; i++) {
                transformPropertyToArrayInObject(settings, problematicCSTransformedToArray[i]);
            }

            saving = SAVING_STATES.RESTORING;
            document.getElementById('SettingsForm').scrollTop = 0;

            return settingsUtils.callRemoteAction(remoteActions.restoreDefaultSettings, [settings]).then(function (updatedSettings) {

                for (var i = 0; i < problematicCSTransformedToArray.length; i++) {
                    transformArrayInObjectToSingle(updatedSettings, problematicCSTransformedToArray[i]);
                }

                saving = SAVING_STATES.SAVED;
                isSettingsDirty = false;

                // update settings objects
                lastFetchedSettings = updatedSettings;
                angular.copy(updatedSettings, draftSettings);

                $rootScope.$broadcast('settingsUpdated');
            }).catch(function () {
                console.error('error restoring to defaults');
            }).finally(function () {
                $timeout(function () {
                    return saving = SAVING_STATES.NOT_SAVING;
                }, 3500);
            });
        }

        function getAutomators(className) {
            var results = [];
            for (var automatorName in draftSettings.AutomatorConfig) {
                var automator = draftSettings.AutomatorConfig[automatorName];

                if (automator[fieldNames.Automator_Config__c.Class_Name__c] == className) results.push(automator);
            }

            return results;
        }

        function getAutomatorsMap(className) {
            var arr = getAutomators(className),
                res = {};

            // only modified automators
            for (var i = 0; i < arr.length; i++) {
                if (modifiedAutomators[arr[i].Name] || !arr[i].Id) {
                    res[arr[i].Name] = arr[i];
                }
            }

            return res;
        }

        function deleteAutomators(className) {
            for (var automatorName in draftSettings.AutomatorConfig) {
                var automator = draftSettings.AutomatorConfig[automatorName];

                if (automator[fieldNames.Automator_Config__c.Class_Name__c] == className) delete draftSettings.AutomatorConfig[automatorName];
            }
        }

        settingsPromise = getSettings();

        // set settings as dirty
        function setDirty() {
            isSettingsDirty = true;
        }

        settingDescriptor.prototype.setDirty = function () {
            setDirty();
            this.dirty = true;
        };

        function getTerritoriesRelatedToAutomator(name) {

            var deferred = $q.defer();

            if (cahcedTerritoriesOnAutomator[name]) {
                deferred.resolve(cahcedTerritoriesOnAutomator[name]);
            } else {

                settingsUtils.callRemoteAction(window.remoteActions.getTerritoriesRelatedToAutomator, [name]).then(function (fetchedTerritories) {

                    cahcedTerritoriesOnAutomator[name] = fetchedTerritories;

                    fetchedTerritories.forEach(function (t) {
                        return territories[t.Id] = fetchedTerritories[t.Id] || t;
                    });

                    deferred.resolve(cahcedTerritoriesOnAutomator[name]);
                });
            }

            return deferred.promise;
        }

        // service object
        var service = {
            getDraftSettings: function getDraftSettings() {
                return draftSettings;
            },
            getSettingsPromise: function getSettingsPromise() {
                return settingsPromise;
            },
            getSLRDirty: getSLRDirty,
            getAutomators: getAutomators,
            getAutomatorsMap: getAutomatorsMap,
            deleteAutomators: deleteAutomators,
            getTerritoriesRelatedToAutomator: getTerritoriesRelatedToAutomator,
            setDirty: setDirty,
            saveSettings: saveSettings,
            restoreDefaultSettings: restoreDefaultSettings,
            isDirty: function isDirty() {
                return lastFetchedSettings && !angular.equals(draftSettings, lastFetchedSettings) /* || isSettingsDirty*/;
            },
            isSaving: function isSaving() {
                return saving;
            },
            isDailyOptimizationPolicy: function isDailyOptimizationPolicy(id) {
                return dailyOptimizationPolicies[id];
            },
            setOriginal: setOriginal,
            getLastFetchedSettings: function getLastFetchedSettings() {
                return lastFetchedSettings;
            },
            getModifiedAutomators: function getModifiedAutomators() {
                return modifiedAutomators;
            },
            getErrorFromServer: function getErrorFromServer() {
                return errorFromServer;
            },
            hideErrors: function hideErrors() {
                return errorFromServer = null;
            },
            finishedLoading: function finishedLoading() {
                return finishedLoadingSettings;
            },
            permissionsMissing: function permissionsMissing() {
                return _permissionsMissing;
            },
            getManyTerritories: function getManyTerritories() {
                return manyTerritories;
            },
            getRelevantTerritoriesForAutomator: function getRelevantTerritoriesForAutomator(name) {
                return cahcedTerritoriesOnAutomator[name];
            },
            getTerritories: function getTerritories(id) {
                return territories[id];
            }, // used when many territories
            getAllTerritories: function getAllTerritories() {
                return territories;
            } // used when many territories

        };

        return service;
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').service('globalActionsService', globalActionsService);

    globalActionsService.$inject = ['dataService'];

    function globalActionsService(dataService) {

        var objectMappings = {};

        return {
            save: function save() {

                var objectMappingsArray = [],
                    deletedObjectsArray = [],
                    deletedObjects = dataService.getDraftSettings().DeletedMappings;

                for (var key in objectMappings) {
                    objectMappingsArray.push(angular.copy(objectMappings[key]));
                    delete objectMappingsArray[objectMappingsArray.length - 1].isOpen;
                }

                deletedObjects.forEach(function (item) {
                    deletedObjectsArray.push(angular.copy(item));
                    delete deletedObjectsArray[deletedObjectsArray.length - 1].isOpen;
                });

                return dataService.saveSettings({
                    EmergencySettings: dataService.getDraftSettings().EmergencySettings,
                    AppointmentBookingSettings: dataService.getDraftSettings().AppointmentBookingSettings,
                    ObjectMapping: objectMappingsArray,
                    deletedMappings: deletedObjectsArray
                }).then(function () {
                    dataService.getDraftSettings().DeletedMappings.length = 0;
                });
            },
            restore: function restore() {
                return dataService.restoreDefaultSettings({
                    EmergencySettings: dataService.getDraftSettings().EmergencySettings,
                    AppointmentBookingSettings: dataService.getDraftSettings().AppointmentBookingSettings,
                    ObjectMapping: []
                });
            },
            loadData: function loadData() {
                return console.info('globalActionsService - Loading settings');
            },
            objectMappings: objectMappings,
            deletedMappings: function deletedMappings() {
                return dataService.getDraftSettings().DeletedMappings;
            }
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').service('healthCheckService', healthCheckService);

    healthCheckService.$inject = [];

    function healthCheckService() {

        return {
            save: function save() {
                return;
            },
            restore: function restore() {
                return;
            },
            loadData: function loadData() {
                return console.info('healthCheckService - Loading settings');
            }
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').constant('OPTIMIZATION_RUNTIME_VALUES', {
        LOW: 1,
        MEDIUM: 2,
        HIGH: 3
    });
})();
'use strict';

(function () {

    angular.module('SettingsApp').service('optimizationService', optimizationService);

    optimizationService.$inject = ['$q', 'dataService', 'OPTIMIZATION_RUNTIME_VALUES'];

    function optimizationService($q, dataService, OPTIMIZATION_RUNTIME_VALUES) {

        // get all object names
        function getAllObjects() {

            var deferred = $q.defer(),
                result = sforce.connection.describeGlobal().sobjects;

            if (result) {
                deferred.resolve(result);
            } else {
                deferred.reject("fields not found");
            }

            return deferred.promise;
        }

        function save() {
            return dataService.saveSettings({
                AuthorizationInfo: dataService.getDraftSettings().AuthorizationInfo,
                OptimizationSettings: dataService.getDraftSettings().OptimizationSettings,
                SoFieldsMapping: dataService.getDraftSettings().SoFieldsMapping,
                LogicSettings: dataService.getDraftSettings().LogicSettings,

                // need all 3 for automators to save
                AutomatorConfig: dataService.getAutomatorsMap('Sched004_OAAS'),
                DeletedAutomators: dataService.getDraftSettings().DeletedAutomators,
                Territories: dataService.getDraftSettings().Territories,
                TriggerConfigurations: {
                    'Enable req overlaps prevention': dataService.getDraftSettings().TriggerConfigurations['Enable req overlaps prevention'],
                    'Enable optimization failure': dataService.getDraftSettings().TriggerConfigurations['Enable optimization failure'],
                    'Enable sharing for Optimization': dataService.getDraftSettings().TriggerConfigurations['Enable sharing for Optimization']
                },

                manyTerritories: dataService.getDraftSettings().manyTerritories
            });
        }

        function restore() {

            var RestoreOptimizationSettingsRSO = ['Pinned_Statuses__c'];
            var RestoreOptimizationSettingsBGO = ['Pinned_Statuses__c'];

            // only if value is low, med or high - restore to default.

            var values = Object.keys(OPTIMIZATION_RUNTIME_VALUES).map(function (key) {
                return OPTIMIZATION_RUNTIME_VALUES[key];
            });

            if (values.indexOf(dataService.getDraftSettings().OptimizationSettings[bgoOptimizationSettings][fieldNames.OptimizationSettings__c.Max_Runtime_Single_Service__c]) > -1) RestoreOptimizationSettingsBGO.push('Max_Runtime_Single_Service__c');

            var RestoreOptimizationSettings = {};
            RestoreOptimizationSettings[rdoOptimizationSettings] = RestoreOptimizationSettingsRSO;
            RestoreOptimizationSettings[bgoOptimizationSettings] = RestoreOptimizationSettingsBGO;

            return dataService.restoreDefaultSettings({
                RestoreOptimizationSettings: RestoreOptimizationSettings,
                OptimizationSettings: dataService.getDraftSettings().OptimizationSettings,
                SoFieldsMapping: dataService.getDraftSettings().SoFieldsMapping,
                RestoreAutomatorSettings: ['Sched004_OAAS'],
                TriggerConfigurations: {
                    'Enable req overlaps prevention': {}, 'Enable optimization failure': {}, 'Enable sharing for Optimization': {}
                }
            });
        }

        function serviceReferenceProperties(objectName) {

            var deferred = $q.defer();

            var result = sforce.connection.describeSObject(objectName);
            if (result.fields) {
                deferred.resolve(result);
            } else {
                deferred.reject("fields not found");
            }
            return deferred.promise;
        }

        return {
            save: save,
            restore: restore,
            loadData: function loadData() {
                return console.info('optimizationService - Loading settings');
            },
            getAllObjects: getAllObjects,
            serviceReferenceProperties: serviceReferenceProperties
        };
    }
})();
'use strict';

(function () {

	angular.module('SettingsApp').constant('primitiveType', {
		boolean: '0',
		number: '1',
		text: '2',
		picklist: '3',
		multi: '4',
		booleanText: '5',
		autoComplete: '6'
	});
})();
'use strict';

(function () {

    angular.module('SettingsApp').constant('SAVING_STATES', {
        NOT_SAVING: 0,
        SAVING: 1,
        SAVED: 2,
        RESTORING: 3
    });
})();
'use strict';

(function () {

    angular.module('SettingsApp').service('schedulingRecipesService', schedulingRecipesService);

    schedulingRecipesService.$inject = ['$q', '$timeout', 'dataService', 'settingsUtils', '$rootScope'];

    function schedulingRecipesService($q, $timeout, dataService, settingsUtils, $rootScope) {

        var recipesSavingStates = {
            SAVING: 0,
            SAVED: 1,
            NOT_SAVING: 2
        };

        var statusCategories = {
            NONE: 'None',
            SCHEDULED: 'Scheduled',
            DISPATCHED: 'Dispatched',
            IN_PROGRESS: 'InProgress',
            COULD_NOT_COMPLETE: 'CannotComplete',
            COMPLETED: 'Completed',
            CANCELED: 'Canceled'
        };

        var fieldTypes = {
            BOOLEAN: 'BOOLEAN',
            DATE: 'DATE',
            DATETIME: 'DATETIME',
            DOUBLE: 'DOUBLE',
            EMAIL: 'EMAIL',
            ID: 'ID',
            INTEGER: 'INTEGER',
            PICKLIST: 'PICKLIST',
            REFERENCE: 'REFERENCE',
            STRING: 'STRING',
            TEXTAREA: 'TEXTAREA',
            CURRENCY: 'CURRENCY',
            PERCENT: 'PERCENT',
            PHONE: 'PHONE'
        };

        var labels = {
            // operators
            equals: "equals", //"{!JSENCODE($Label.equals)}",
            not_equal_to: "not equal to", //"{!JSENCODE($Label.not_equal_to)}",
            less_than: "less than", //"{!JSENCODE($Label.less_than)}",
            greater_than: "greater than", //"{!JSENCODE($Label.greater_than)}",
            less_or_equal: "less or equal", //"{!JSENCODE($Label.less_or_equal)}",
            greater_or_equal: "greater or equal", //"{!JSENCODE($Label.greater_or_equal)}",
            contains: "contains", //"{!JSENCODE($Label.contains)}",
            does_not_contain: "does bot contain", //"{!JSENCODE($Label.does_not_contain)}",
            starts_with: "starts With" //"{!JSENCODE($Label.start_with)}",
        };

        var parentFieldDescribe = { name: "ParentPriority", label: "Parent Priority", fieldType: 'INTEGER', priority: 1 };

        var operators = {

            'equals': {
                label: labels.equals,
                availability: [fieldTypes.BOOLEAN, fieldTypes.DATE, fieldTypes.DATETIME, fieldTypes.DOUBLE, fieldTypes.EMAIL, fieldTypes.ID, fieldTypes.INTEGER, fieldTypes.REFERENCE, fieldTypes.STRING, fieldTypes.TEXTAREA, fieldTypes.CURRENCY, fieldTypes.PERCENT, fieldTypes.PHONE]
            },

            'not equal to': {
                label: labels.not_equal_to,
                availability: [fieldTypes.BOOLEAN, fieldTypes.DATE, fieldTypes.DATETIME, fieldTypes.DOUBLE, fieldTypes.EMAIL, fieldTypes.ID, fieldTypes.INTEGER, fieldTypes.REFERENCE, fieldTypes.STRING, fieldTypes.TEXTAREA, fieldTypes.CURRENCY, fieldTypes.PERCENT, fieldTypes.PHONE]
            },

            'less than': {
                label: labels.less_than,
                availability: [fieldTypes.DATE, fieldTypes.DATETIME, fieldTypes.INTEGER, fieldTypes.DOUBLE, fieldTypes.CURRENCY, fieldTypes.PERCENT]
            },

            'greater than': {
                label: labels.greater_than,
                availability: [fieldTypes.DATE, fieldTypes.DATETIME, fieldTypes.INTEGER, fieldTypes.DOUBLE, fieldTypes.CURRENCY, fieldTypes.PERCENT]
            },

            'less or equal': {
                label: labels.less_or_equal,
                availability: [fieldTypes.DATE, fieldTypes.DATETIME, fieldTypes.INTEGER, fieldTypes.DOUBLE, fieldTypes.CURRENCY, fieldTypes.PERCENT]
            },

            'greater or equal': {
                label: labels.greater_or_equal,
                availability: [fieldTypes.DATE, fieldTypes.DATETIME, fieldTypes.INTEGER, fieldTypes.DOUBLE, fieldTypes.CURRENCY, fieldTypes.PERCENT]
            },

            'contains': {
                label: labels.contains,
                availability: [fieldTypes.PICKLIST, fieldTypes.STRING, fieldTypes.TEXTAREA, fieldTypes.REFERENCE, fieldTypes.PHONE]
            },

            'does not contain': {
                label: labels.does_not_contain,
                availability: [fieldTypes.PICKLIST, fieldTypes.STRING, fieldTypes.TEXTAREA, fieldTypes.REFERENCE, fieldTypes.PHONE]
            },

            'starts with': {
                label: labels.starts_with,
                availability: [fieldTypes.STRING, fieldTypes.TEXTAREA, fieldTypes.REFERENCE, fieldTypes.PHONE]
            }
        };

        var logicTypes = { all: { label: 'Meet All Criteria', value: 'all' },
            any: { label: 'Meet Any Criteria', value: 'any' },
            custom: { label: 'Use Custom Logic', value: 'custom' } };

        var data = {
            schedulingRecipesTypes: {},
            schedulingRecipes: {},
            serviceFieldsDescribe: {},
            expectedBehaviors: {},
            territoriesMap: {},
            workTypes: {},
            criteriaObjectTypeServiceAppointment: 'ServiceAppointment',
            serviceAppointmentScheduleDispatchedStatuses: [],
            savingRecipeState: recipesSavingStates.NOT_SAVING,
            manyTerritories: false,
            onSettingChangeSaveRecipeListener: undefined

        },
            deferData = {
            data: $q.defer()
        };

        function parseAvailableExpectedBehaviors(expectedBehaviors) {

            return expectedBehaviors.reduce(function (map, obj) {

                for (var idx in obj.scenarioTypes) {
                    if (!map[obj.scenarioTypes[idx]]) {
                        map[obj.scenarioTypes[idx]] = {};
                    }

                    map[obj.scenarioTypes[idx]][obj.id] = obj;
                }

                return map;
            }, {});
        }

        function parseSchedulingRecipesScenarioTypes(schedulingRecipesTypes) {

            var scenarioTypeToIdMap = {};
            scenarioTypeToIdMap[schedulingRecipesConstants.scenarioTypesCancelled] = 'scenarioTypesCancelled';
            scenarioTypeToIdMap[schedulingRecipesConstants.scenarioTypesShortened] = 'scenarioTypesShortened';
            scenarioTypeToIdMap[schedulingRecipesConstants.scenarioTypesLengthened] = 'scenarioTypesLengthened';
            scenarioTypeToIdMap[schedulingRecipesConstants.scenarioTypesEmergency] = 'scenarioTypesEmergency';

            return schedulingRecipesTypes.reduce(function (map, obj) {
                map[obj.value] = { label: obj.label, value: obj.value, id: scenarioTypeToIdMap[obj.value], description: obj.description, relatedObject: obj.relatedObject, isEditable: false };
                return map;
            }, {});
        }

        function parseSchedulingRecipes(schedulingRecipesMap) {

            var foundActiveRecipesOfTypeOverlap = false;

            var schedulingRecipesMapStandardize = {};

            for (var type in schedulingRecipesMap) {

                schedulingRecipesMapStandardize[type] = {};

                for (var id in schedulingRecipesMap[type]) {

                    var recipeObj = new SchedulingRecipe(schedulingRecipesMap[type][id]);

                    if (recipeObj.Active__c && (recipeObj.Scenario_Type__c === schedulingRecipesConstants.scenarioTypesLengthened || recipeObj.Scenario_Type__c === schedulingRecipesConstants.scenarioTypesEmergency)) {
                        foundActiveRecipesOfTypeOverlap = true;
                    }

                    schedulingRecipesMapStandardize[type][id] = recipeObj;
                }
            }

            $rootScope.$broadcast('ActiveRecipesOfTypeOverlap', foundActiveRecipesOfTypeOverlap);

            return schedulingRecipesMapStandardize;
        }

        function parseTerritoriesToTree(territoriesMap) {

            var territoriesIds = Object.keys(territoriesMap);

            var territoriesValues = territoriesIds.map(function (key) {
                return territoriesMap[key];
            });

            territoriesValues.map(function (territory) {
                territory.children = [];
                territory.isOpen = false;
                territory.filter = true;
                territoriesIds.push(territory.Id);
            });

            var territoriesRoots = territoriesValues.filter(function (territory) {
                if (territory.ParentTerritory === undefined) {
                    return true;
                } else {
                    return territoriesIds.indexOf(territory.ParentTerritory.Id) === -1;
                }
            });

            var nodes = [];

            territoriesRoots.map(function (territory) {
                nodes.push(territory);
            });

            var _loop = function _loop() {

                var node = nodes.pop();

                var children = territoriesValues.filter(function (territory) {
                    if (territory.ParentTerritory === undefined) {
                        return false;
                    } else {
                        return territory.ParentTerritory.Id === node.Id;
                    }
                });

                children.map(function (territory) {
                    node.children.push(territory);
                    nodes.push(territory);
                });
            };

            while (nodes.length > 0) {
                _loop();
            }

            return territoriesRoots;
        }

        function deleteSchedulingRecipe(recipeToDelete) {

            var defer = $q.defer();

            settingsUtils.callRemoteAction(remoteActions.deleteSchedulingRecipe, [recipeToDelete.Id, recipeToDelete.Criteria__r.Id]).then(function (deletedSuccessfully) {

                if (deletedSuccessfully) {
                    if (!!data.schedulingRecipes[recipeToDelete.Scenario_Type__c][recipeToDelete.Id]) {
                        delete data.schedulingRecipes[recipeToDelete.Scenario_Type__c][recipeToDelete.Id];
                    }

                    var foundActiveRecipesOfTypeOverlap = false;

                    for (var id in data.schedulingRecipes[schedulingRecipesConstants.scenarioTypesLengthened]) {

                        var recipeObj = data.schedulingRecipes[schedulingRecipesConstants.scenarioTypesLengthened][id];

                        if (recipeObj.Active__c) {
                            foundActiveRecipesOfTypeOverlap = true;
                        }
                    }

                    for (var _id in data.schedulingRecipes[schedulingRecipesConstants.scenarioTypesEmergency]) {

                        var _recipeObj = data.schedulingRecipes[schedulingRecipesConstants.scenarioTypesEmergency][_id];

                        if (_recipeObj.Active__c) {
                            foundActiveRecipesOfTypeOverlap = true;
                        }
                    }

                    var recipesTypeMap = data.schedulingRecipes[recipeToDelete.Scenario_Type__c];

                    var recipesTypeMapArray = [];

                    Object.keys(recipesTypeMap).map(function (key) {
                        recipesTypeMapArray.push(recipesTypeMap[key]);
                    });

                    if (recipesTypeMapArray) {
                        recipesTypeMapArray.sort(function (a, b) {
                            return a.Priority__c - b.Priority__c;
                        });
                    }

                    for (var index in recipesTypeMapArray) {
                        recipesTypeMapArray[index].Priority__c = parseInt(index);
                    }

                    $rootScope.$broadcast('ActiveRecipesOfTypeOverlap', foundActiveRecipesOfTypeOverlap);

                    saveSchedulingRecipesPriorities(recipesTypeMapArray, recipeToDelete.Scenario_Type__c).then(function () {
                        defer.resolve();
                    });
                } else {
                    defer.reject();
                }
            });

            return defer.promise;
        }

        function saveSchedulingRecipesPriorities(recipes, recipeType) {

            var defer = $q.defer();

            document.getElementById('SettingsForm').scrollTop = 0;
            data.savingRecipeState = recipesSavingStates.SAVING;

            settingsUtils.callRemoteAction(remoteActions.saveSchedulingRecipes, [recipes]).then(function (res) {
                data.savingRecipeState = recipesSavingStates.SAVED;

                for (var i = 0; i < recipes.length; i++) {
                    if (data.schedulingRecipes[recipeType]) {
                        data.schedulingRecipes[recipeType][recipes[i].Id] = recipes[i];
                    }
                }

                $timeout(function () {
                    return data.savingRecipeState = recipesSavingStates.NOT_SAVING;
                }, 3500);

                defer.resolve(res);
            });

            return defer.promise;
        }

        function saveSchedulingRecipe(recipe, disableAutoFixOverlaps) {

            var defer = $q.defer();

            document.getElementById('SettingsForm').scrollTop = 0;
            data.savingRecipeState = recipesSavingStates.SAVING;

            var criteriaToSave = angular.copy(recipe.Criteria__r);

            criteriaToSave.Criteria_Items__c = JSON.stringify(criteriaToSave.Criteria_Items__c);
            criteriaToSave.Logic__c = JSON.stringify(criteriaToSave.Logic__c);
            criteriaToSave.Territories__c = JSON.stringify(criteriaToSave.Territories__c);
            criteriaToSave.Work_Types__c = JSON.stringify(criteriaToSave.Work_Types__c);

            var userTypes = '';

            criteriaToSave.User_Type__c.map(function (type, index) {
                if (index + 1 === criteriaToSave.User_Type__c.length) {
                    userTypes += type;
                } else {
                    userTypes += type + ';';
                }
            });

            criteriaToSave.User_Type__c = userTypes;

            var recipeToSave = angular.copy(recipe);

            if (!recipeToSave.Id) {
                recipeToSave.Priority__c = Object.keys(data.schedulingRecipes[recipeToSave.Scenario_Type__c]).length;
            }

            recipeToSave.Post_Actions__c = JSON.stringify(recipeToSave.Post_Actions__c);

            if (disableAutoFixOverlaps) {

                disableDynamicGanttFixOverlaps();

                data.onSettingChangeSaveRecipeListener = $rootScope.$on('settingsUpdated', function () {
                    saveSchedulingRecipeAction(recipeToSave, criteriaToSave, defer);
                });
            } else {
                saveSchedulingRecipeAction(recipeToSave, criteriaToSave, defer);
            }

            return defer.promise;
        }

        function saveSchedulingRecipeAction(recipeToSave, criteriaToSave, defer) {
            settingsUtils.callRemoteAction(remoteActions.saveSchedulingRecipe, [recipeToSave, criteriaToSave]).then(function (savedRecipe) {

                var savedRecipeJs = undefined;

                if (savedRecipe !== null) {

                    savedRecipeJs = new SchedulingRecipe(savedRecipe);
                    data.schedulingRecipes[savedRecipeJs.Scenario_Type__c][savedRecipeJs.Id] = savedRecipeJs;

                    if (savedRecipeJs.Scenario_Type__c === schedulingRecipesConstants.scenarioTypesLengthened || savedRecipeJs.Scenario_Type__c === schedulingRecipesConstants.scenarioTypesEmergency) {

                        var foundActiveRecipesOfTypeOverlap = false;

                        Object.keys(data.schedulingRecipes[savedRecipeJs.Scenario_Type__c]).map(function (recipeId) {
                            if (data.schedulingRecipes[savedRecipeJs.Scenario_Type__c][recipeId].Active__c) {
                                foundActiveRecipesOfTypeOverlap = true;
                            }
                        });

                        $rootScope.$broadcast('ActiveRecipesOfTypeOverlap', foundActiveRecipesOfTypeOverlap);
                    }

                    data.schedulingRecipes[savedRecipeJs.Scenario_Type__c] = Object.assign({}, data.schedulingRecipes[savedRecipeJs.Scenario_Type__c]);

                    data.savingRecipeState = recipesSavingStates.SAVED;
                    $timeout(function () {
                        return data.savingRecipeState = recipesSavingStates.NOT_SAVING;
                    }, 3500);

                    if (data.onSettingChangeSaveRecipeListener !== undefined) {
                        data.onSettingChangeSaveRecipeListener();
                        data.onSettingChangeSaveRecipeListener = undefined;
                    }

                    defer.resolve(savedRecipeJs);
                } else {

                    data.savingRecipeState = recipesSavingStates.SAVED;
                    $timeout(function () {
                        return data.savingRecipeState = recipesSavingStates.NOT_SAVING;
                    }, 3500);

                    if (data.onSettingChangeSaveRecipeListener !== undefined) {
                        data.onSettingChangeSaveRecipeListener();
                        data.onSettingChangeSaveRecipeListener = undefined;
                    }

                    defer.reject();
                }
            }).catch(function (res) {
                data.savingRecipeState = recipesSavingStates.SAVED;
                $timeout(function () {
                    return data.savingRecipeState = recipesSavingStates.NOT_SAVING;
                }, 3500);

                if (data.onSettingChangeSaveRecipeListener !== undefined) {
                    data.onSettingChangeSaveRecipeListener();
                    data.onSettingChangeSaveRecipeListener = undefined;
                }

                defer.reject();
            });
        }

        function hasActiveRecipe() {
            for (var recipeType in data.schedulingRecipes) {
                for (var recipeId in data.schedulingRecipes[recipeType]) {
                    if (data.schedulingRecipes[recipeType] && data.schedulingRecipes[recipeType][recipeId].Active__c) {
                        return true;
                    }
                }
            }

            return false;
        }

        function loadData() {

            settingsUtils.callRemoteAction(remoteActions.loadSchedulingRecipesData).then(function (schedulingRecipesData) {
                data.expectedBehaviors = parseAvailableExpectedBehaviors(schedulingRecipesData.expectedBehaviors);
                data.schedulingRecipesTypes = parseSchedulingRecipesScenarioTypes(schedulingRecipesData.schedulingRecipesTypes);
                data.schedulingRecipes = parseSchedulingRecipes(schedulingRecipesData.schedulingRecipes);
                data.territoriesTree = parseTerritoriesToTree(schedulingRecipesData.territories);
                data.workTypes = schedulingRecipesData.workTypes;
                data.territoriesMap = schedulingRecipesData.territories;
                data.serviceFieldsDescribe = schedulingRecipesData.serviceFieldsDescribe;
                data.criteriaObjectTypes = schedulingRecipesData.criteriaObjectTypes;
                data.criteriaUserTypes = schedulingRecipesData.criteriaUserTypes;
                data.criteriaObjectTypeServiceAppointment = schedulingRecipesData.criteriaObjectTypeServiceAppointment;
                data.serviceAppointmentScheduleDispatchedStatuses = schedulingRecipesData.serviceAppointmentScheduleDispatchedStatuses;
                data.manyTerritories = schedulingRecipesData.manyTerritories;
                deferData.data.resolve();
            }).catch(function (ex) {
                console.error(ex);
                deferData.data.reject();
            });
        }

        function disableDynamicGanttFixOverlaps() {

            var enableGanttFixOverlaps = dataService.getLastFetchedSettings().TriggerConfigurations['Enable Dynamic Gantt Fix Overlaps'];
            enableGanttFixOverlaps[fieldNames.triggerConf.Run__c] = false;

            var saveObject = {
                TriggerConfigurations: {
                    'Enable Dynamic Gantt Fix Overlaps': enableGanttFixOverlaps
                }
            };

            return dataService.saveSettings(saveObject);
        }

        function isEdgeEnabled() {

            var optimizationSettings = dataService.getDraftSettings().OptimizationSettings;
            var edgeOptimizationEnabled = true;

            for (var optSetting in optimizationSettings) {
                if (optimizationSettings[optSetting][fieldNames.OptimizationSettings__c.Use_Edge__c] === false) {
                    edgeOptimizationEnabled = false;
                    break;
                }
            }

            return edgeOptimizationEnabled || useEdgeFMA;
        }

        function isCustomLogicExpressionIsInvalid(logicExpression, criteriaItems) {

            for (var i = 0; i < criteriaItems.length; i++) {
                if (criteriaItems[i].operator === null || criteriaItems[i].field === null || criteriaItems[i].value === null) {
                    return true;
                }
            }

            if (logicExpression.type === logicTypes.custom.value) {

                var logicFilter = logicExpression.logic;

                if (!logicFilter) {
                    return true;
                }

                logicFilter = logicFilter.split('AND').join('&&');
                logicFilter = logicFilter.split('OR').join('||');
                logicFilter = logicFilter.split('NOT').join('!');

                for (var _i = 2; _i <= 10; _i++) {
                    logicFilter = logicFilter.split(_i).join('true');
                }

                logicFilter = logicFilter.split(1).join('true');

                var isValid = false;

                try {
                    window.eval(logicFilter);
                    isValid = true;
                } catch (ex) {
                    console.log('bad format');
                }

                return !(isValid && checkIfAllConditionsInLogic(logicExpression.logic, criteriaItems) && checkIfLogicPadded(logicExpression.logic));
            }

            if (!logicExpression.type && criteriaItems.length > 0) {
                return true;
            }

            return false;
        }

        function checkIfAllConditionsInLogic(logicStr, criteriaItems) {

            if (!logicStr) {
                return true;
            }

            var digitArray = logicStr.match(/\d/g),
                indexesFound = {},
                haveConditions = void 0;

            for (var i = 0; i < criteriaItems.length; i++) {
                indexesFound[criteriaItems[i].index] = false; // condition index present, will be true if in logic
                haveConditions = true;
            }

            // there are no conditions but logic is filled
            if (!haveConditions && logicStr !== "") {
                return false;
            }

            for (var _i2 = 0; _i2 < digitArray.length; _i2++) {

                var currentDigit = digitArray[_i2];

                if (currentDigit === '1') {

                    // removing 10s and checking if still got 1s
                    var logicFilterNo10 = logicStr.split(10).join('');

                    if (logicFilterNo10.indexOf('1') > -1) {

                        if (indexesFound[1] === undefined) {
                            return false;
                        } else {
                            indexesFound[1] = true;
                            continue;
                        }
                    } else {
                        continue;
                    }
                }

                if (currentDigit === '0') {

                    if (indexesFound[10] === undefined) {
                        return false;
                    } else {
                        indexesFound[10] = true;
                        continue;
                    }
                }

                // we have index that is not present on logic
                if (indexesFound[currentDigit] === undefined) {
                    return false;
                }

                // we have index both on logic and condition
                else {
                        indexesFound[currentDigit] = true;
                    }
            }

            for (var _i3 in indexesFound) {
                if (!indexesFound[_i3]) {
                    return false;
                }
            }

            return true;
        }

        function checkIfLogicPadded(logicStr) {
            if (!logicStr) {
                return true;
            }

            var words = ['&&', '!', '||'];

            //no multiple spaces allowed
            if (logicStr.replace(/\s\s+/g, ' ') != logicStr) return false;

            for (var i = 0; i < words.length; i++) {
                var word = words[i];
                var pos = logicStr.indexOf(word);

                while (pos > -1) {

                    //check for spaces
                    if (logicStr[pos - 1] !== ' ' || logicStr[pos + word.length] !== ' ') return false;

                    pos = logicStr.indexOf(word, pos + 1);
                }
            }

            return true;
        }

        function save() {
            // return dataService.saveSettings({
            // });
        }

        function restore() {
            // return dataService.restoreDefaultSettings({
            // });
        }

        return {
            save: save,
            restore: restore,
            loadData: loadData,
            isEdgeEnabled: isEdgeEnabled,
            hasActiveRecipe: hasActiveRecipe,
            deleteSchedulingRecipe: deleteSchedulingRecipe,
            saveSchedulingRecipe: saveSchedulingRecipe,
            saveSchedulingRecipesPriorities: saveSchedulingRecipesPriorities,
            isCustomLogicExpressionIsInvalid: isCustomLogicExpressionIsInvalid,
            schedulingRecipesData: function schedulingRecipesData() {
                return data;
            },
            schedulingRecipes: function schedulingRecipes() {
                return data.schedulingRecipes;
            },
            schedulingRecipesTypes: function schedulingRecipesTypes() {
                return data.schedulingRecipesTypes;
            },
            criteriaObjectTypes: function criteriaObjectTypes() {
                return data.criteriaObjectTypes;
            },
            expectedBehaviors: function expectedBehaviors() {
                return data.expectedBehaviors;
            },
            serviceFieldsDescribe: function serviceFieldsDescribe() {
                return data.serviceFieldsDescribe;
            },
            criteriaUserTypes: function criteriaUserTypes() {
                return data.criteriaUserTypes;
            },
            territoriesMap: function territoriesMap() {
                return data.territoriesMap;
            },
            territoriesTree: function territoriesTree() {
                return data.territoriesTree;
            },
            workTypes: function workTypes() {
                return data.workTypes;
            },
            manyTerritories: function manyTerritories() {
                return data.manyTerritories;
            },
            getSavingRecipesState: function getSavingRecipesState() {
                return data.savingRecipeState;
            },
            serviceAppointmentScheduleDispatchedStatuses: function serviceAppointmentScheduleDispatchedStatuses() {
                return data.serviceAppointmentScheduleDispatchedStatuses;
            },
            criteriaObjectTypeServiceAppointment: function criteriaObjectTypeServiceAppointment() {
                return data.criteriaObjectTypeServiceAppointment;
            },
            operators: operators,
            recipesSavingStates: recipesSavingStates,
            fieldTypes: fieldTypes,
            logicTypes: logicTypes,
            parentFieldDescribe: parentFieldDescribe,
            statusCategories: statusCategories,
            promises: {
                data: function data() {
                    return deferData.data.promise;
                }
            }
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').service('schedulingService', schedulingService);

    schedulingService.$inject = ['settingsUtils', 'dataService'];

    function schedulingService(settingsUtils, dataService) {

        var loadDataPromise = null;

        function restore() {

            var automatorConfig = ['Sched009_STMIntegrityChecker'];

            if (dataService.getDraftSettings().LogicSettings.Use_SLR__c) {
                automatorConfig.push('Sched006_SLRPurge');
            }

            return dataService.restoreDefaultSettings({
                TriggerConfigurations: {
                    'Travel Time': {},
                    'Wait for clean state': {},
                    'Enable Dynamic Gantt Fix Overlaps': {}
                },
                GeneralConfig: {
                    'Map available on gantt': {},
                    'Show SLR in resource map': {}
                },
                RestoreLogicSettings: ['Fail_On_Schedule__c', 'Travel_Speed__c', 'MDT_Boolean_Field__c', 'WO_Priority_Field__c', 'WOLI_Priority_Field__c', 'Travel_Speed_Unit__c', 'Search_slot_max_days__c', 'Pinned_Statuses_SF__c', 'Enable_Start_Of_Day__c', 'Use_New_MST_Data_Model__c', 'Approved_Absences__c', 'Enable_Crew_Members_Skill_Aggregation__c', 'Include_Secondary_Calendar__c', 'Limit_Apex_Operations__c'],
                RestoreGeocodeSettings: ['Alert_On_Callout_Failure__c', 'FSL__Use_SFMaps__c'],
                LogicSettings: dataService.getDraftSettings().LogicSettings,
                ApexLimits: dataService.getDraftSettings().ApexLimits,
                GeocodeSettings: dataService.getDraftSettings().GeocodeSettings,
                ServiceOnCreationValidations: dataService.getDraftSettings().ServiceOnCreationValidations,
                DynamicGanttSettings: dataService.getDraftSettings().DynamicGanttSettings,
                RestoreAutomatorSettings: automatorConfig
            });
        }

        var service = {
            save: function save() {

                var automatorConfig = dataService.getAutomatorsMap('Sched009_STMIntegrityChecker');

                if (dataService.getDraftSettings().LogicSettings[fieldNames.Logic_Settings__c.Use_SLR__c]) {
                    automatorConfig = angular.merge(automatorConfig, dataService.getAutomators('Sched006_SLRPurge'));
                }

                var saveObject = {

                    ApexLimits: dataService.getDraftSettings().ApexLimits,

                    GeneralConfig: {
                        'Map available on gantt': dataService.getDraftSettings().GeneralConfig['Map available on gantt'],
                        'Show SLR in resource map': dataService.getDraftSettings().GeneralConfig['Show SLR in resource map'],
                        'Hide Integrity Checker Automator': dataService.getDraftSettings().GeneralConfig['Hide Integrity Checker Automator'],
                        'Enable Scheduling Bundling': dataService.getDraftSettings().GeneralConfig['Enable Scheduling Bundling']
                    },

                    LogicSettings: dataService.getDraftSettings().LogicSettings,
                    GeocodeSettings: dataService.getDraftSettings().GeocodeSettings,
                    ServiceOnCreationValidations: dataService.getDraftSettings().ServiceOnCreationValidations,
                    DynamicGanttSettings: dataService.getDraftSettings().DynamicGanttSettings,
                    TriggerConfigurations: {
                        'Travel Time': dataService.getDraftSettings().TriggerConfigurations['Travel Time'],
                        'Wait for clean state': dataService.getDraftSettings().TriggerConfigurations['Wait for clean state'],
                        'Enable Dynamic Gantt Fix Overlaps': dataService.getDraftSettings().TriggerConfigurations['Enable Dynamic Gantt Fix Overlaps'],
                        'Enable Service Auto Classification': dataService.getDraftSettings().TriggerConfigurations['Enable Service Auto Classification']
                    },

                    // need all 3 for automators to save
                    AutomatorConfig: automatorConfig,
                    DeletedAutomators: dataService.getDraftSettings().DeletedAutomators,
                    Territories: dataService.getDraftSettings().Territories,
                    manyTerritories: dataService.getDraftSettings().manyTerritories
                };

                var restoreAutomators = [];

                if (dataService.getAutomators('Sched006_SLRPurge').length === 0 && dataService.getDraftSettings().LogicSettings[fieldNames.Logic_Settings__c.Use_SLR__c]) {
                    restoreAutomators.push('Sched006_SLRPurge');
                    saveObject.RestoreAutomatorSettings = restoreAutomators;
                }

                return dataService.saveSettings(saveObject);
            },
            restore: restore,
            loadData: function loadData() {
                if (loadDataPromise) return loadDataPromise;

                loadDataPromise = settingsUtils.callRemoteAction(remoteActions.schedulingLoadData).then(function (res) {
                    service.settings = res;
                });

                return loadDataPromise;
            }
        };

        return service;
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').service('serviceAppointmentLifeCycleService', serviceAppointmentLifeCycleService);

    serviceAppointmentLifeCycleService.$inject = ['dataService', 'settingsUtils', '$rootScope'];

    function serviceAppointmentLifeCycleService(dataService, settingsUtils, $rootScope) {
        var prom = null;
        var transitionsValid = true;
        var errorMessage = "Error saving status transitions:\n";

        function checkAllFlows() {
            transitionsValid = true;
            errorMessage = "Error saving status transitions:\n";
            var cloned = dataService.getDraftSettings().ServiceLegalStatuses.slice(0).sort(sortByName);

            for (var i = 0; i < cloned.length; i++) {

                // is from == to?
                if (cloned[i][fieldNames.statusTransitions.From_Status__c] === cloned[i][fieldNames.statusTransitions.To_Status__c]) {
                    transitionsValid = false;
                    errorMessage += 'From & To cannot be equal - ' + cloned[i][fieldNames.statusTransitions.From_Status__c] + ' \n';
                }

                // is duplicate?
                if (i == cloned.length - 1) break;

                if (cloned[i][fieldNames.statusTransitions.From_Status__c] === cloned[i + 1][fieldNames.statusTransitions.From_Status__c] && cloned[i][fieldNames.statusTransitions.To_Status__c] === cloned[i + 1][fieldNames.statusTransitions.To_Status__c]) {
                    transitionsValid = false;
                    errorMessage += 'Duplicate transition - ' + cloned[i][fieldNames.statusTransitions.From_Status__c] + ' -> ' + cloned[i][fieldNames.statusTransitions.To_Status__c] + ' \n';
                }
            }

            return transitionsValid;
        }
        function randomizeId() {
            var text = "";
            var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

            for (var i = 0; i < 20; i++) {
                text += possible.charAt(Math.floor(Math.random() * possible.length));
            }return text;
        }

        function sortByName(a, b) {
            var joinedStringA = a[fieldNames.statusTransitions.From_Status__c] + a[fieldNames.statusTransitions.To_Status__c];
            var joinedStringB = b[fieldNames.statusTransitions.From_Status__c] + b[fieldNames.statusTransitions.To_Status__c];
            if (joinedStringA < joinedStringB) return -1;
            if (joinedStringA > joinedStringB) return 1;
            return 0;
        }

        var instance = {
            settings: {},
            save: function save() {

                dataService.getDraftSettings().ServiceLegalStatuses = dataService.getDraftSettings().ServiceLegalStatuses.map(function (statusTransition) {
                    statusTransition.Name = randomizeId();

                    delete statusTransition.Id;
                    return statusTransition;
                });

                if (!checkAllFlows()) {
                    $rootScope.$broadcast('transitionsError', { msg: errorMessage });
                    //alert(errorMessage);
                    return;
                } else {
                    $rootScope.$broadcast('transitionsError', { msg: null });
                }

                return dataService.saveSettings({
                    TriggerConfigurations: {
                        'Service Type Derive Due Date': dataService.getDraftSettings().TriggerConfigurations['Service Type Derive Due Date'],
                        'Pinned Service Not Changed': dataService.getDraftSettings().TriggerConfigurations['Pinned Service Not Changed'],
                        'Service Duration Longer Than Minute': dataService.getDraftSettings().TriggerConfigurations['Service Duration Longer Than Minute'],
                        'Enable Service Auto Classification': dataService.getDraftSettings().TriggerConfigurations['Enable Service Auto Classification']
                    },
                    Dictionaries: dataService.getDraftSettings().Dictionaries,
                    LogicSettings: dataService.getDraftSettings().LogicSettings,
                    ServiceLegalStatuses: dataService.getDraftSettings().ServiceLegalStatuses,
                    GeneralConfig: {
                        'Status Transitions Policy': dataService.getDraftSettings().GeneralConfig['Status Transitions Policy']
                    }
                });
            },
            restore: function restore() {
                return dataService.restoreDefaultSettings({
                    TriggerConfigurations: {
                        'Service Type Derive Due Date': {},
                        'Pinned Service Not Changed': {},
                        'Service Duration Longer Than Minute': {},
                        'Enable Service Auto Classification': {}
                    },
                    RestoreLogicSettings: ['Low_Or_High_Territory_Classification__c'],
                    Dictionaries: dataService.getDraftSettings().Dictionaries,
                    GeneralConfig: {
                        'Status Transitions Policy': {}
                    },
                    LogicSettings: dataService.getDraftSettings().LogicSettings,
                    ServiceLegalStatuses: dataService.getDraftSettings().ServiceLegalStatuses
                });
            },
            loadData: function loadData() {
                if (prom) return prom;

                prom = settingsUtils.callRemoteAction(remoteActions.ServiceLifeCycle.LoadData).then(function (res) {
                    instance.settings = res;
                });

                return prom;
            }
        };

        return instance;
    };
})();
'use strict';

(function () {

    angular.module('SettingsApp').service('settingsUtils', settingsUtils);

    settingsUtils.$inject = ['$q'];

    function settingsUtils($q) {

        function callRemoteAction(functionName, paramsArray) {
            var buffer = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;


            var deferred = $q.defer();

            paramsArray = paramsArray || [];

            paramsArray.unshift(functionName);
            paramsArray.push(function (result, event) {

                if (event.status) {
                    deferred.resolve(result);
                } else {
                    deferred.reject(event);
                }
            });

            paramsArray.push({ buffer: buffer, escape: false, timeout: 120000 });
            Visualforce.remoting.Manager.invokeAction.apply(Visualforce.remoting.Manager, paramsArray);

            return deferred.promise;
        }

        function outOfRange(value, low, max) {
            return value < low || max < value;
        }

        function safeApply(scope, fn) {

            var phase = scope.$root.$$phase;

            if (phase === '$apply' || phase === '$digest') {
                if (fn && typeof fn === 'function') {
                    fn();
                }
            } else {
                scope.$apply(fn);
            }
        }

        function openLink(Id) {
            var isConsole = openConsoleTab(null, Id);

            if (!isConsole) window.open('../' + Id, '_blank');
        }

        var isInConsole = function isInConsole() {
            return typeof sforce !== "undefined" ? sforce.console.isInConsole() : null;
        };

        // open url in console (if not in console, do nothing)
        function openConsoleTab(e, id) {

            if (isInConsole()) {

                if (e) e.preventDefault();

                sforce.console.generateConsoleUrl(['/' + id], function (result) {
                    if (result.success) sforce.console.openConsoleUrl(null, result.consoleUrl, true);else openLightningPrimaryTab(id);
                });

                return true;
            }

            return false;
        }

        function openLightningPrimaryTab(id) {
            sforce.console.openPrimaryTab(null, '/' + id, true);
        }

        return {
            callRemoteAction: callRemoteAction,
            outOfRange: outOfRange,
            safeApply: safeApply,
            openLink: openLink
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('autoComplete', autoComplete);

    autoComplete.$inject = ['$q', 'settingsUtils'];

    function autoComplete($q, settingsUtils) {

        controllerFunction.$inject = ['$scope'];

        function controllerFunction($scope) {
            $scope.setDirty = function () {
                return $scope.object.dirty = true;
            };

            $scope.innerGetSuggestions = function (val) {
                return $scope.getSuggestions({ inputValue: val });
            };

            $scope.innerFilterInput = function (val) {
                return $scope.filterInput({ inputValue: val });
            };
        }

        var template = '<div class="setting-row-container">\n                            <label class="select-label" for="{{object.id}}">\n                                {{ object.label }} <tooltip ng-if="tooltipText">{{tooltipText}}</tooltip>\n                            </label>\n                            <div class="select-container autoCompleteContainer">\n                                <input typeahead-editable="false" \n                                        typeahead-input-formatter="innerFilterInput($model)" \n                                        uib-typeahead="suggestion for suggestion in innerGetSuggestions($viewValue)" \n                                        typeahead-min-length="2" \n                                        typeahead-wait-ms="200" \n                                        id="{{object.id}}" \n                                        type="text" class="input-settings" \n                                        ng-model="object.value" \n                                        ng-change="object.setDirty()" />\n                            </div>\n                        </div>';

        return {
            restrict: 'E',
            scope: {
                object: '=',
                tooltip: '@',
                getSuggestions: '&',
                filterInput: '&'
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('booleanSetting', booleanSetting);

    booleanSetting.$inject = [];

    function booleanSetting() {

        controllerFunction.$inject = ['$scope'];

        function controllerFunction($scope) {
            $scope.setDirty = function () {
                return $scope.object.dirty = true;
            };
            $scope.showBadge = !!$scope.isBeta;

            $scope.OnChange = function () {
                $scope.object.setDirty();

                if ($scope.change()) {
                    $scope.change()($scope.object.value);
                }
            };
        }

        var template = '<div class="setting-row-container">\n                            <label for="{{object.id}}" class="select-label">\n                                {{ object.label }} \n                                <learn-more-link ng-if="learnLink" link="learnLink"></learn-more-link>\n                                <tooltip ng-if="tooltipText">{{tooltipText}}</tooltip> \n                                <beta-feature text="isBeta" ng-if="showBadge"></beta-feature>\n                            </label>\n                            <div class="select-container">\n                                <div class="slds-checkbox">\n                                    <label class="slds-checkbox__label">\n                                        <input type="checkbox" ng-model="object.value" ng-disabled="isDisabled" ng-change="OnChange()"/> \n                                        <span class="slds-checkbox_faux"></span>\n                                    </label>\n                                </div>\n                            </div>\n                        </div>';

        return {
            restrict: 'E',
            scope: {
                object: '=',
                tooltipText: '@',
                isDisabled: '=',
                isBeta: '=',
                learnLink: '=',
                change: '&'
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('booleanTextSetting', booleanTextSetting);

    booleanTextSetting.$inject = [];

    function booleanTextSetting() {

        controllerFunction.$inject = ['$scope'];

        function controllerFunction($scope) {
            $scope.setDirty = function () {
                return $scope.object.dirty = true;
            };
        }

        var template = '<div class="setting-row-container">\n                            <label for="{{object.id}}" class="select-label">\n                                {{ object.label }} <tooltip ng-if="tooltipText">{{tooltipText}}</tooltip>\n                            </label>\n                            <div class="select-container">\n                                <div class="slds-checkbox">\n                                    <label class="slds-checkbox__label">\n                                        <input id="{{object.id}}" ng-disabled="isDisabled" type="checkbox" ng-model="object.booleanValue" ng-change="object.setDirty(); object.setValue()"/>\n                                        <span class="slds-checkbox_faux"></span>\n                                    </label>\n                                </div>\n                            </div>\n                        </div>';

        return {
            restrict: 'E',
            scope: {
                object: '=',
                isDisabled: '=',
                tooltipText: '@'
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('multiPicklistSetting', multiPicklistSetting);

    multiPicklistSetting.$inject = [];

    function multiPicklistSetting() {

        controllerFunction.$inject = ['$scope', '$rootScope'];

        function controllerFunction($scope, $rootScope) {
            $scope.setDirty = function () {
                return $scope.object.dirty = true;
            };
            $scope.showDrop = false;

            // valueType - string - can be 'string', 'object', 'array'
            $scope.optionClicked = function (option, valueType) {
                var optionsArray = typeof $scope.object.value == 'string' ? $scope.object.value.split(',') : $scope.object.value;
                var options = {};

                if (!optionsArray) {
                    optionsArray = [];
                }

                for (var i = 0; i < optionsArray.length; i++) {
                    options[optionsArray[i]] = true;
                }

                //remove if exists
                if (options[option]) delete options[option];else options[option] = true;

                delete options[''];

                switch (valueType) {
                    case 'string':
                        $scope.object.value = Object.keys(options).toString();
                        break;
                    case 'array':
                        $scope.object.value = Object.keys(options);
                        break;
                    case 'object':
                        $scope.object.value = options;

                }
            };

            $rootScope.$on('closeAllOthers', function (ev, args) {
                if ($scope.$parent.setting.Name != args.status.Name) $scope.showDrop = false;
            });
        }

        var template = '<div class="setting-row-container">\n                            <label class="select-label" for="{{object.id}}" ng-if="object.label">\n                                {{ object.label }}\n                            </label>\n                            <div class="select-container">\n                                <div class="select-setting" ng-click="showDrop = !showDrop;">\n                                    {{ placeholder }}\n                                </div>\n                                <ul class="multi-dropdown" ng-show="showDrop">\n                                    <li class="single-dropdown-item" ng-repeat="option in object.options track by $index" ng-click="optionClicked(option.Id, \'string\')">\n                                        <svg aria-hidden="true" class="check-icon" ng-show="object.value.indexOf(option.Id) > -1">\n                                            \u2028<use xlink:href="' + settings.icons.check + '"></use>\n                                        \u2028</svg>\n                                        {{option.Name}}\n                                    </li>\n                                </ul>\n                            </div>\n                        </div>';

        return {
            restrict: 'E',
            scope: {
                object: '=',
                placeholder: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('numberSetting', numberSetting);

    numberSetting.$inject = [];

    function numberSetting() {

        controllerFunction.$inject = ['$scope'];

        function controllerFunction($scope) {
            $scope.setDirty = function () {
                return $scope.object.dirty = true;
            };

            $scope.$watch('object.value', function (newValue, oldValue) {
                if (newValue != oldValue && newValue === undefined) {
                    $scope.object.value = oldValue;
                }
            });
        }

        var template = '<div class="setting-row-container">\n                            <label for="{{object.id}}" class="select-label">\n                                {{ object.label }} <tooltip ng-if="tooltipText">{{tooltipText}}</tooltip>\n                            </label>\n                            <div class="select-container">\n                                <input id="{{object.id}}" type="number" min="{{ object.min }}" max="{{ object.max }}" class="input-settings" ng-model="object.value" ng-change="object.setDirty()" />\n                            </div>\n                        </div>';

        return {
            restrict: 'E',
            scope: {
                object: '=',
                tooltipText: '@'
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('picklistSetting', picklistSetting);

    picklistSetting.$inject = [];

    function picklistSetting() {

        controllerFunction.$inject = ['$scope'];

        function controllerFunction($scope) {
            $scope.setDirty = function () {
                return $scope.object.dirty = true;
            };

            $scope.validateOnChange = function (status) {
                $scope.object.setDirty();
                $scope.change && $scope.change();
            };
        }

        var template = '<div class="setting-row-container">\n                            <label class="select-label" for="{{object.id}}" ng-if="object.label">\n                                {{ object.label }} <tooltip ng-if="tooltipText">{{tooltipText}}</tooltip>\n                            </label>\n                            <div class="select-container">\n                                <div class="slds-select_container">\n                                    <select id="{{object.id}}" class="slds-select" ng-disabled="isDisabled" ng-model="object.value" ng-change="validateOnChange()" ng-options="option.value as option.label for option in object.options">\n                                        <option ng-if="isDisabled" value="" selected="isDisabled">Custom Configuration</option>\n                                    </select>\n                                </div>\n                            </div>\n                        </div>';

        return {
            restrict: 'E',
            scope: {
                object: '=',
                tooltipText: '@',
                isDisabled: '=',
                change: '&'
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('picklistSettingLightning', picklistSettingLightning);

    picklistSettingLightning.$inject = [];

    function picklistSettingLightning() {

        controllerFunction.$inject = ['$scope'];

        function controllerFunction($scope) {

            $scope.optionsOpen = false;
            $scope.tooltipOpen = false;;
            $scope.optionsArray = [];

            $scope.toggleOptions = function () {
                if (!$scope.isDisabled && $scope.optionsArray.length > 0) {
                    $scope.optionsOpen = !$scope.optionsOpen;
                }
            };

            $scope.selectOption = function (option, event) {

                if ($scope.isMultiSelect) {

                    var index = $scope.object[$scope.valueField].indexOf(option[$scope.optionValueField]);

                    if (index > -1) {
                        $scope.object[$scope.valueField].splice(index, 1);
                        delete $scope.selectedOption[option[$scope.optionValueField]];
                    } else {
                        $scope.object[$scope.valueField].push(option[$scope.optionValueField]);
                        $scope.selectedOption[option[$scope.optionValueField]] = option;
                    }
                } else {
                    $scope.object[$scope.valueField] = option[$scope.optionValueField];
                    $scope.selectedOption = option;

                    if (!!event) {
                        $scope.toggleOptions();
                    }
                }

                if (!!event) {
                    event.stopPropagation();
                }

                if ($scope.change()) {
                    $scope.change()(option);
                }
            };

            $scope.parseData = function () {

                $scope.selectedOption = $scope.isMultiSelect ? {} : undefined;

                if ($scope.isMultiSelect) {
                    if (!Array.isArray($scope.object[$scope.valueField])) {
                        $scope.object[$scope.valueField] = [];
                    }
                }

                if (Array.isArray($scope.options)) {

                    for (var idx = 0; idx < $scope.options.length; idx++) {

                        var currentOption = $scope.options[idx];

                        if (!$scope.isMultiSelect) {
                            if (currentOption[$scope.optionValueField] === $scope.object[$scope.valueField]) {
                                $scope.selectedOption = currentOption;
                            }
                        } else {
                            if ($scope.object[$scope.valueField].indexOf(currentOption[$scope.optionValueField]) > -1) {
                                $scope.selectedOption[currentOption[$scope.optionValueField]] = currentOption;
                            }
                        }
                    }

                    $scope.optionsArray = $scope.options;
                } else {

                    if (!!$scope.options) {

                        var optionsKeys = Object.keys($scope.options);

                        if ($scope.optionsArray.length !== optionsKeys.length) {

                            $scope.optionsArray = optionsKeys.map(function (key) {
                                return $scope.options[key];
                            });

                            $scope.optionsArray.sort(function (a, b) {
                                return a.priority - b.priority;
                            });
                        }

                        for (var option in $scope.options) {

                            var _currentOption = $scope.options[option];

                            if (!$scope.isMultiSelect) {
                                if (_currentOption[$scope.optionValueField] === $scope.object[$scope.valueField]) {
                                    $scope.selectedOption = _currentOption;
                                }
                            } else {
                                if ($scope.object[$scope.valueField].indexOf(_currentOption[$scope.optionValueField]) > -1) {
                                    $scope.selectedOption[_currentOption[$scope.optionValueField]] = _currentOption;
                                }
                            }
                        }
                    }
                }

                if ($scope.optionsArray.length === 1) {
                    $scope.selectOption($scope.optionsArray[0], undefined);
                }
            };

            $scope.parseData();

            $scope.getValue = function () {
                if (!$scope.selectedOption || !$scope.options) {
                    return undefined;
                }

                if ($scope.isMultiSelect) {
                    if ($scope.object[$scope.valueField].length === 0) {
                        return undefined;
                    } else if ($scope.object[$scope.valueField].length === 1) {
                        return $scope.selectedOption[$scope.object[$scope.valueField][0]][$scope.optionLabelField];
                    } else {
                        return $scope.object[$scope.valueField].length + ' Options Selected';
                    }
                } else {
                    return $scope.selectedOption[$scope.optionLabelField];
                }
            };

            $scope.$watch('options', function (newValue) {
                $scope.parseData();
            });

            $scope.$watch('object', function (newValue) {
                $scope.parseData();
            });

            $scope.isOptionsOpen = function () {
                return $scope.optionsOpen;
            };

            //
            // $scope.isTooltipOpen = function () {
            //     return $scope.tooltipOpen;
            // };
            //
            //
            // $scope.toggleTooltip = function () {
            //     $scope.tooltipOpen = !$scope.tooltipOpen;
            // };

            $scope.isInvalid = function () {
                if ($scope.isRequired) {
                    if ($scope.isMultiSelect) {
                        if (!$scope.object[$scope.valueField] || $scope.object[$scope.valueField].length === 0) {
                            return true;
                        } else {
                            return false;
                        }
                    } else {
                        if (!$scope.object[$scope.valueField]) {
                            return true;
                        } else {
                            return false;
                        }
                    }
                } else {
                    return false;
                }
            };
        }

        var template = '<div class="slds-form-element" ng-class="{\'slds-has-error\': isInvalid() , \'slds-m-vertical_x-small\' : title != undefined}">\n                            <label class="slds-form-element__label" ng-if="title != undefined">\n                                <abbr class="slds-required" title="required" ng-if="isInvalid()">* </abbr>\n                                {{title}}\n                                <button class="slds-button slds-button_icon" aria-describedby="help" ng-if="tooltip" ng-mouseover="tooltipOpen = true" ng-mouseleave="tooltipOpen = false">\n                                    <svg class="slds-button__icon" aria-hidden="true">\n                                        <use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="' + settings.icons.info + '" />\n                                    </svg>\n                                    <span class="slds-assistive-text">Help</span>\n                                    <div class="slds-popover slds-popover_tooltip slds-nubbin_bottom-left" role="tooltip" id="help" style="position: absolute; width: 250px;" ng-style="{\'left\' : tooltipLeft, \'top\': tooltipTop }" ng-show="tooltipOpen">\n                                        <div class="slds-popover__body">{{tooltip}}</div>\n                                    </div>\n                                </button>\n                            </label>\n                            <div class="slds-form-element__control" click-outside="toggleOptions()" is-active="isOptionsOpen()" ng-click="toggleOptions()">\n                                <div class="slds-combobox_container">\n                                    <div class="slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click slds-is-open" aria-expanded="true" aria-haspopup="listbox" role="combobox">\n                                        <div class="slds-combobox__form-element slds-input-has-icon slds-input-has-icon_right" role="none">                                            \n                                            <input placeholder="Select..." type="text" class="slds-input slds-combobox__input input-standard-size" ng-value="getValue()" \n                                                    readonly="" aria-controls="listbox-id" ng-disabled="isDisabled || optionsArray.length == 0" style="cursor: pointer">\n                                            <span class="slds-icon_container slds-icon-utility-down slds-input__icon slds-input__icon_right" style="z-index: unset">\n                                                <svg class="slds-icon slds-icon slds-icon_x-small slds-icon-text-default" aria-hidden="true">\n                                                    <use xlink:href="' + settings.icons.down + '"></use>\n                                                </svg>\n                                            </span>\n                                            <div id="listbox-id" role="listbox" ng-show="isOptionsOpen()">\n                                                <ul class="slds-listbox slds-listbox_vertical slds-dropdown slds-dropdown_fluid slds-text-align_left input-standard-size lightning-picklist-container" role="presentation">\n                                                    <li ng-repeat="option in optionsArray track by $index" role="presentation" class="slds-listbox__item cancel-margin" ng-click="selectOption(option, $event)" title="{{option[optionLabelField]}}">\n                                                        <div id="listbox-option-{{$index}}" class="slds-media slds-listbox__option slds-listbox__option_plain slds-media_small slds-media_center" ng-class="{\'slds-is-selected\': selectedOption[option[optionValueField]]}" role="option">\n                                                            <span class="slds-media__figure" ng-show="isMultiSelect">\n                                                                <svg class="slds-icon slds-icon_x-small slds-listbox__icon-selected" aria-hidden="true">\n                                                                    <use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="' + settings.icons.check + '" />\n                                                                </svg>\n                                                            </span>\n                                                            <span class="slds-media__body">\n                                                                <span class="slds-truncate">{{option[optionLabelField]}}</span>\n                                                            </span>\n                                                        </div>\n                                                    </li>\n                                                </ul>\n                                            </div>\n                                        </div>\n                                        <div class="slds-form-element__help" style="text-align: left" id="error-message-unique-id" ng-if="isRequired" ng-show="isInvalid() && !isOptionsOpen()">This field is required</div>\n                                    </div>\n                                </div>\n                            </div>\n                        </div>';

        return {
            restrict: 'E',
            scope: {
                object: '=',
                valueField: '@',
                options: '=',
                optionLabelField: '@',
                optionValueField: '@',
                isDisabled: '=',
                change: '&',
                isMultiSelect: '=',
                isRequired: '=',
                title: '@',
                tooltip: '@',
                tooltipTop: '@',
                tooltipLeft: '@'

            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('textSetting', textSetting);

    textSetting.$inject = [];

    function textSetting() {

        controllerFunction.$inject = ['$scope'];

        function controllerFunction($scope) {
            $scope.setDirty = function () {
                return $scope.object.dirty = true;
            };
        }

        var template = '<div class="setting-row-container">\n                            <label class="select-label" for="{{object.id}}">\n                                {{ object.label }} <tooltip ng-if="tooltipText">{{tooltipText}}</tooltip>\n                            </label>\n                            <div class="select-container">\n                                <input id="{{object.id}}" type="text" class="input-settings" maxlength="{{object.maxlength}}" ng-model="object.value" ng-change="object.setDirty()" />\n                            </div>\n                        </div>';

        return {
            restrict: 'E',
            scope: {
                object: '=',
                tooltipText: '@'
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('dispatchAutomation', dispatchAutomation);

    dispatchAutomation.$inject = [];

    function dispatchAutomation() {

        controllerFunction.$inject = ['$scope', 'dataService', 'primitiveType', '$rootScope'];

        function controllerFunction($scope, dataService, primitiveType, $rootScope) {
            $scope.primitiveType = primitiveType;
            $scope.settings = dataService.getDraftSettings();

            dataService.getSettingsPromise().then(function () {
                $scope.automators = dataService.getAutomators('Sched007_ServicesAppoDispatched');
            });

            $scope.getTriggerConfFieldName = function (field) {
                return fieldNames.triggerConf[field];
            };

            $rootScope.$on('settingsUpdated', function () {
                $scope.automators = dataService.getAutomators('Sched007_ServicesAppoDispatched');
            });

            $scope.chatterDispatchPostDestionation = [{ label: 'Service Appointment Feed', value: 'sa' }, { label: 'Parent Record Feed', value: 'wo' }];

            // $scope.verifyFunctions.push( () => {
            //
            //     let invalidAutomator = false;
            //
            //     $scope.automators.forEach(a => {
            //         if (!a.valid) {
            //             invalidAutomator = true;
            //         }
            //     });
            //
            //
            //     if (invalidAutomator) {
            //         alert('You have invalid automators set. Please fix them upon saving.');
            //     }
            //
            //     return invalidAutomator;
            //
            // });
        }

        var template = '\n            <custom-settings-wrapper id="__disschedjobs" primitive-type="primitiveType.boolean" label-field-name="\'Description__c\'" value-field-name="\'Run__c\'" setting="settings.TriggerConfigurations[\'Mention user on service dispatch\'] "></custom-settings-wrapper>\n\n            <custom-settings-wrapper ng-if="settings.TriggerConfigurations[\'Mention user on service dispatch\'][getTriggerConfFieldName(\'Run__c\')]" options="chatterDispatchPostDestionation"  primitive-type="primitiveType.picklist" label="\'Dispatch Chatter Post Destination\'" \n            \n            value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Post chatter posts on parent or record\']" tooltip-text="Select where to post Chatter notifications when an appointment is dispatched. The post mentions the resources assigned to the appointment."></custom-settings-wrapper>\n           \n            <div class="automatorExp">Set recurring auto dispatch jobs</div>\n            <automators id="__automention" objects="automators" class-names="[\'Sched007_ServicesAppoDispatched\']"></automators>\n        ';

        return {
            restrict: 'E',
            scope: {
                formObject: '=',
                verifyFunctions: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('dispatchDripFeed', dispatchDripFeed);

    dispatchDripFeed.$inject = [];

    function dispatchDripFeed() {

        controllerFunction.$inject = ['$scope', 'dataService', 'primitiveType'];

        function controllerFunction($scope, dataService, primitiveType) {
            $scope.primitiveType = primitiveType;
            $scope.verifyFunctions.push(function () {
                return console.log('verify - dispatchDripFeed');
            });
            $scope.settings = dataService.getDraftSettings();
        }

        var template = '\n            <custom-settings-wrapper primitive-type="primitiveType.boolean" label="\'Enable drip feed dispatching\'" value-field-name="\'Value__c\'" setting="settings.DripFeedConfig" tooltip-text="Wait to dispatch a service resource\u2019s subsequent service appointment(s) until the previous appointment is completed. This option helps minimize confusion in field service operations where the schedule changes frequently. You can set overriding drip feed preferences using the drip feed fields on service territory records."></custom-settings-wrapper>\n            <custom-settings-wrapper min="1" max="200" primitive-type="primitiveType.number" label="\'Service Appointments to Dispatch\'" value-field-name="\'Tasks_To_Dispatch__c\'" setting="settings.DripFeedConfig" tooltip-text="The number of appointments dispatched to a service resource at a time if drip feed dispatching is enabled." ></custom-settings-wrapper>\n        ';

        return {
            restrict: 'E',
            scope: {
                verifyFunctions: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').service('dispatchService', dispatchService);

    dispatchService.$inject = ['dataService'];

    function dispatchService(dataService) {

        return {
            save: function save() {
                return dataService.saveSettings({
                    TriggerConfigurations: {
                        'Mention user on service dispatch': dataService.getDraftSettings().TriggerConfigurations['Mention user on service dispatch']
                    },
                    GeneralConfig: {
                        'Post chatter posts on parent or record': dataService.getDraftSettings().GeneralConfig['Post chatter posts on parent or record']
                    },
                    DripFeedConfig: dataService.getDraftSettings().DripFeedConfig,
                    // need all 3 for automators to save
                    AutomatorConfig: dataService.getAutomatorsMap('Sched007_ServicesAppoDispatched'),
                    DeletedAutomators: dataService.getDraftSettings().DeletedAutomators,
                    Territories: dataService.getDraftSettings().Territories,
                    manyTerritories: dataService.getDraftSettings().manyTerritories
                });
            },
            restore: function restore() {
                return dataService.restoreDefaultSettings({
                    TriggerConfigurations: {
                        'Mention user on service dispatch': {}
                    },
                    GeneralConfig: {
                        'Post chatter posts on parent or record': {}
                    },
                    DripFeedConfig: dataService.getDraftSettings().DripFeedConfig,
                    RestoreAutomatorSettings: ['Sched007_ServicesAppoDispatched']
                });
            },
            loadData: function loadData() {
                return console.info('dispatchService - Loading settings');
            }
        };
    }
})();
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

(function () {

    angular.module('SettingsApp').directive('mapUi', mapUi);

    mapUi.$inject = [];

    function mapUi() {

        controllerFunction.$inject = ['$scope', 'dataService'];

        function controllerFunction($scope, dataService) {

            var CHOOSE_REPORT = { Id: null, Name: 'Select a report' };

            var __reports = [],
                __mapsReportIdsMap = {},
                __reportsThatAreAlreadyConfigured = {};

            $scope.iconsCollection = {
                action: ["add_contact", "add_file", "add_photo_video", "add_relationship", "announcement", "apex", "approval", "back", "call", "canvas", "change_owner", "change_record_type", "check", "clone", "close", "defer", "delete", "description", "dial_in", "download", "edit_groups", "edit_relationship", "edit", "email", "fallback", "filter", "flow", "follow", "following", "freeze_user", "goal", "google_news", "info", "join_group", "lead_convert", "leave_group", "log_a_call", "log_event", "manage_perm_sets", "map", "more", "new_account", "new_campaign", "new_case", "new_child_case", "new_contact", "new_event", "new_group", "new_lead", "new_note", "new_notebook", "new_opportunity", "new_person_account", "new_task", "new", "password_unlock", "preview", "priority", "question_post_action", "quote", "recall", "record", "refresh", "reject", "remove_relationship", "remove", "reset_password", "share_file", "share_link", "share_poll", "share_post", "share_thanks", "share", "sort", "submit_for_approval", "update_status", "update", "upload", "user_activation", "user", "view_relationship", "web_link"],
                custom: ["custom1", "custom2", "custom3", "custom4", "custom5", "custom6", "custom7", "custom8", "custom9", "custom10", "custom11", "custom12", "custom13", "custom14", "custom15", "custom16", "custom17", "custom18", "custom19", "custom20", "custom21", "custom22", "custom23", "custom24", "custom25", "custom26", "custom27", "custom28", "custom29", "custom30", "custom31", "custom32", "custom33", "custom34", "custom35", "custom36", "custom37", "custom38", "custom39", "custom40", "custom41", "custom42", "custom43", "custom44", "custom45", "custom46", "custom47", "custom48", "custom49", "custom50", "custom51", "custom52", "custom53", "custom54", "custom55", "custom56", "custom57", "custom58", "custom59", "custom60", "custom61", "custom62", "custom63", "custom64", "custom65", "custom66", "custom67", "custom68", "custom69", "custom70", "custom71", "custom72", "custom73", "custom74", "custom75", "custom76", "custom77", "custom78", "custom79", "custom80", "custom81", "custom82", "custom83", "custom84", "custom85", "custom86", "custom87", "custom88", "custom89", "custom90", "custom91", "custom92", "custom93", "custom94", "custom95", "custom96", "custom97", "custom98", "custom99", "custom100", "custom101", "custom102", "custom103", "custom104", "custom105", "custom106", "custom107", "custom108", "custom109", "custom110", "custom111", "custom112"],
                standard: ["account", "address", "announcement", "answer_best", "answer_private", "answer_public", "approval", "apps_admin", "apps", "article", "asset_relationship", "assigned_resource", "avatar_loading", "avatar", "bot", "business_hours", "calibration", "call_history", "call", "campaign_members", "campaign", "canvas", "carousel", "case_change_status", "case_comment", "case_email", "case_log_a_call", "case_milestone", "case_transcript", "case", "channel_program_history", "channel_program_levels", "channel_program_members", "channel_programs", "client", "cms", "coaching", "connected_apps", "contact_list", "contact", "contract_line_item", "contract", "custom_notification", "custom", "customers", "dashboard", "datadotcom", "default", "document", "drafts", "email_chatter", "email", "empty", "endorsement", "entitlement_process", "entitlement_template", "entitlement", "entity_milestone", "entity", "environment_hub", "event", "feed", "feedback", "file", "flow", "folder", "forecasts", "goals", "group_loading", "groups", "hierarchy", "home", "household", "insights", "investment_account", "lead_insights", "lead_list", "lead", "link", "list_email", "live_chat", "location", "log_a_call", "macros", "maintenance_asset", "maintenance_plan", "marketing_actions", "merge", "metrics", "news", "note", "omni_supervisor", "operating_hours", "opportunity_splits", "opportunity", "orders", "partner_fund_allocation", "partner_fund_claim", "partner_fund_request", "partner_marketing_budget", "partners", "past_chat", "people", "performance", "person_account", "photo", "poll", "portal", "post", "pricebook", "process", "product_consumed", "product_item_transaction", "product_item", "product_request_line_item", "product_request", "product_required", "product_transfer", "product", "question_best", "question_feed", "quick_text", "quip_sheet", "quip", "quotes", "recent", "record", "related_list", "relationship", "report", "resource_absence", "resource_capacity", "resource_preference", "resource_skill", "return_order_line_item", "return_order", "reward", "rtc_presence", "sales_path", "scan_card", "search", "service_appointment", "service_contract", "service_crew_member", "service_crew", "service_report", "service_resource", "service_territory_location", "service_territory_member", "service_territory", "shipment", "skill_entity", "skill_requirement", "skill", "social", "solution", "sossession", "task", "task2", "team_member", "template", "thanks_loading", "thanks", "timesheet_entry", "timesheet", "timeslot", "today", "topic", "topic2", "unmatched", "user", "work_order_item", "work_order", "work_type"],
                utility: ["activity", "ad_set", "add", "adduser", "anchor", "animal_and_nature", "announcement", "answer", "answered_twice", "apex", "approval", "apps", "arrowdown", "arrowup", "attach", "automate", "back", "ban", "block_visitor", "bold", "bookmark", "breadcrumbs", "broadcast", "brush", "bucket", "builder", "call", "campaign", "cancel_file_request", "cancel_transfer", "capslock", "case", "cases", "center_align_text", "change_owner", "change_record_type", "chart", "chat", "check", "checkin", "chevrondown", "chevronleft", "chevronright", "chevronup", "classic_interface", "clear", "clock", "close", "collapse_all", "color_swatch", "comments", "company", "connected_apps", "contract_alt", "contract", "copy_to_clipboard", "copy", "crossfilter", "custom_apps", "cut", "dash", "database", "datadotcom", "dayview", "delete", "deprecate", "description", "desktop_console", "desktop", "dislike", "dock_panel", "down", "download", "edit_form", "edit", "email", "emoji", "end_call", "end_chat", "erect_window", "error", "event", "expand_all", "expand_alt", "expand", "fallback", "favorite", "feed", "file", "filter", "filterList", "flow", "food_and_drink", "forward", "frozen", "full_width_view", "graph", "groups", "help", "hide", "hierarchy", "home", "identity", "image", "inbox", "info_alt", "info", "insert_tag_field", "insert_template", "internal_share", "italic", "jump_to_bottom", "jump_to_top", "justify_text", "kanban", "keyboard_dismiss", "knowledge_base", "layers", "layout", "left_align_text", "left", "level_up", "light_bulb", "like", "link", "list", "listen", "location", "lock", "log_a_call", "logout", "lower_flag", "macros", "magicwand", "mark_all_as_read", "matrix", "merge_field", "merge", "metrics", "minimize_window", "missed_call", "moneybag", "monthlyview", "move", "muted", "new_direct_message", "new_window", "new", "news", "note", "notebook", "notification", "office365", "offline_cached", "offline", "omni_channel", "open_folder", "open", "opened_folder", "outbound_call", "overflow", "package_org_beta", "package_org", "package", "page", "palette", "paste", "pause", "people", "phone_landscape", "phone_portrait", "photo", "picklist", "pin", "pinned", "power", "preview", "priority", "privately_shared", "process", "push", "puzzle", "question_mark", "question", "questions_and_answers", "quick_text", "quotation_marks", "rating", "record_create", "record", "redo", "refresh", "relate", "reminder", "remove_formatting", "remove_link", "replace", "reply_all", "reply", "reset_password", "resource_absence", "resource_capacity", "resource_territory", "retweet", "richtextbulletedlist", "richtextindent", "richtextnumberedlist", "richtextoutdent", "right_align_text", "right", "rotate", "rows", "rules", "salesforce1", "save", "search", "sentiment_negative", "sentiment_neutral", "settings", "setup_assistant_guide", "setup", "share_file", "share_mobile", "share_post", "share", "shield", "shopping_bag", "side_list", "signpost", "smiley_and_people", "sms", "snippet", "socialshare", "sort", "spinner", "standard_objects", "stop", "strikethrough", "success", "summary", "summarydetail", "switch", "symbols", "sync", "table", "tablet_landscape", "tablet_portrait", "tabset", "task", "text_background_color", "text_color", "threedots_vertical", "threedots", "thunder", "tile_card_list", "topic", "touch_action", "trail", "travel_and_places", "trending", "turn_off_notifications", "type_tool", "undelete", "undeprecate", "underline", "undo", "unlock", "unmuted", "up", "upload", "user_role", "user", "video", "voicemail_drop", "volume_high", "volume_low", "volume_off", "warning", "weeklyview", "wifi", "work_order_type", "world", "yubi_key", "zoomin", "zoomout"]
            };

            $scope.colors = ["#215786", "#0074D9", "#7FDBFF", "#39CCCC", "#3D9970", "#2ECC40", "#7ac47a", "#dcda5c", "#facb00", "#FF851B", "#FF4136", "#85144b", "#f87393", "#a37edb", "#9fb7cc", "#111111", "#AAAAAA", "#dcdcdc"];

            $scope.settings = dataService.getDraftSettings();
            $scope.colorBox = { x: 0, y: 0, show: false };
            $scope.iconBox = { x: 0, y: 0, show: false };
            $scope.disableAddReport = true;
            $scope.loadingReports = true;

            $scope.fields = {
                color: window.fieldNames.MapReport__c.Color__c,
                icon: window.fieldNames.MapReport__c.Icon__c,
                reportId: window.fieldNames.MapReport__c.Report_Id__c
            };

            function resetNewMapReportObject() {

                $scope.newMapReport = { Name: null };
                $scope.newMapReport[$scope.fields.color] = $scope.colors[0];
                $scope.newMapReport[$scope.fields.icon] = 'action,add_contact';
                $scope.newMapReport[$scope.fields.reportId] = null;
            }

            resetNewMapReportObject();

            // init - get reports
            Visualforce.remoting.Manager.invokeAction(remoteActions.getReportsWithGeolocationCols, function (result, ev) {

                $scope.$apply(function () {

                    __reports = result;

                    __reports.forEach(function (r) {
                        return __mapsReportIdsMap[r.Id] = r;
                    });

                    var filteredReports = $scope.getReports();

                    if (filteredReports.length > 1) {
                        $scope.newMapReport[$scope.fields.reportId] = filteredReports[0].Id;
                    }

                    $scope.loadingReports = false;
                });
            }, { buffer: true, escape: true, timeout: 120000 });

            // mark reports that already have a config object to avoid duplicates
            dataService.getSettingsPromise().then(function () {

                $scope.settings.MapReports.forEach(function (report) {
                    __reportsThatAreAlreadyConfigured[report[$scope.fields.reportId]] = true;
                });
            });

            $scope.addReport = function () {

                if ($scope.disableAddReport || !$scope.newMapReport[$scope.fields.reportId]) {
                    return;
                }

                $scope.settings.NewMapReports = $scope.settings.NewMapReports || [];

                __reportsThatAreAlreadyConfigured[$scope.newMapReport[$scope.fields.reportId]] = true;
                $scope.newMapReport.Name = __mapsReportIdsMap[$scope.newMapReport[$scope.fields.reportId]].Name;
                $scope.settings.NewMapReports.push($scope.newMapReport);
                resetNewMapReportObject();
            };

            $scope.showPicker = function ($event, pickerType) {
                $event.stopPropagation();
                pickerType.x = $event.currentTarget.getBoundingClientRect().left + 'px';
                pickerType.y = $event.currentTarget.getBoundingClientRect().top + 34 + 'px';
                pickerType.show = !pickerType.show;
            };

            $scope.getReports = function getReports() {

                var reports = [CHOOSE_REPORT];

                __reports.forEach(function (r) {

                    if (!__reportsThatAreAlreadyConfigured[r.Id]) {
                        reports.push(r);
                    }
                });

                $scope.disableAddReport = reports.length === 1;

                return reports;
            };

            $scope.generateIconUrl = function (spriteAndIcon) {
                var _spriteAndIcon$split = spriteAndIcon.split(','),
                    _spriteAndIcon$split2 = _slicedToArray(_spriteAndIcon$split, 2),
                    sprite = _spriteAndIcon$split2[0],
                    icon = _spriteAndIcon$split2[1];

                return window.globalIcon + '/' + sprite + '-sprite/svg/symbols.svg#' + icon;
            };

            $scope.deleteReport = function (report, index) {

                $scope.settings.DeletedMapReports = $scope.settings.DeletedMapReports || [];

                if (report.Id) {
                    $scope.settings.MapReports.splice(index, 1);
                    $scope.settings.DeletedMapReports.push(report);
                } else {
                    $scope.settings.NewMapReports.splice(index, 1);
                }

                __reportsThatAreAlreadyConfigured[report[$scope.fields.reportId]] = false;
            };
        }

        var template = '\n\n                <div>\n                    \n                    <div class="section-settings">Report Styles</div>\n                    \n                    <div style="margin:20px 0;">\n                    Select a report from the list below, then assign it an icon and a color. Reports that aren\'t customized here use the default icon and color for their object type. \n                    Only reports with geolocation fields can be displayed on the Gantt map.\n                    </div>\n                \n                \n                    <div>\n                    \n                        <div class="mr-form-container">\n                            <label>Report</label>\n                            <select class="slds-select" ng-model="newMapReport[fields.reportId]" ng-disabled="disableAddReport">\n                                <option ng-disabled="!report.Id" ng-repeat="report in getReports()" value="{{report.Id}}"> {{ report.Name }} </option>\n                            </select>\n                        </div>\n                        \n                        \n                        <div class="mr-form-container">\n                            <div id="mr-color" ng-click="showPicker($event, colorBox)">\n                                <div ng-style="{ background: newMapReport[fields.color] }"></div>\n                            </div>\n                        </div>\n                        \n                        <div class="mr-picker-transparent-container" ng-show="colorBox.show" ng-click="colorBox.show = false">\n                            <div id="mr-color-picker" style="left:{{colorBox.x}}; top:{{colorBox.y}}">\n                                <span ng-repeat="color in colors" style="background:{{color}}" ng-click="newMapReport[fields.color] = color"></span>\n                            </div>\n                        </div>\n                        \n                        <div class="mr-form-container">\n                            <div id="mr-icon" ng-click="showPicker($event, iconBox)">\n                                <svg class="mr-icon-display"><use xlink:href="{{ generateIconUrl(newMapReport[fields.icon]) }}"></use></svg>\n                            </div>\n                        </div>\n                        \n                        \n                        <div class="mr-picker-transparent-container" ng-show="iconBox.show" ng-click="iconBox.show = false">\n                        \n                            <div id="mr-icon-picker" style="left:{{iconBox.x}}; top:{{iconBox.y}}">\n                                <span ng-repeat="(collection, icons) in iconsCollection">\n                                    <span ng-repeat="sprite in icons" aria-hidden="true" ng-click="newMapReport[fields.icon] = collection + \',\' + sprite" class="mr-icon-box">\n                                        <svg class="custom-slds-icon">\n                                            <use xlink:href="{{generateIconUrl(collection + \',\' + sprite)}}"></use>\n                                        </svg>\n                                    </span>\n                                </span>\n                            </div>\n                            \n                        </div>\n                        \n                        <div class="mr-form-container">\n                            <div id="mr-add" ng-click="addReport()">Add Report</div>\n                        </div>\n                        \n                        \n                        <span class="mr-loading" ng-show="loadingReports">\n                            <img src="' + window.settings.icons.loading + '" />\n                            Loading Reports\n                        </span>\n                        \n                    </div>\n                        \n                        \n                        \n                    <div id="mr-reports-container" ng-show="settings.NewMapReports.length > 0 || settings.MapReports.length > 0">\n                              \n                        <div class="mr-report" ng-repeat="report in settings.NewMapReports track by $index">\n                        \n                            <svg class="mr-icon-display-row" style="background:{{report[fields.color]}}"><use xlink:href="{{ generateIconUrl(report[fields.icon]) }}"></use></svg>\n                            <span>{{ report.Name }}</span>\n                            <div class="mr-delete-config" ng-click="deleteReport(report, $index)">Delete Configuration</div>\n                           \n                        </div>\n                    \n                        <div class="mr-report" ng-repeat="report in settings.MapReports track by $index">\n                        \n                            <svg class="mr-icon-display-row" style="background:{{report[fields.color]}}"><use xlink:href="{{ generateIconUrl(report[fields.icon]) }}"></use></svg>\n                            <span>{{ report.Name }}</span>\n                            <div class="mr-delete-config" ng-click="deleteReport(report, $index)">Delete Configuration</div>\n                        \n                        </div>\n                    \n                    </div>\n                    \n                </div>\n            ';

        return {
            restrict: 'E',
            scope: {
                verifyFunctions: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

(function () {

    angular.module('SettingsApp').directive('customActions', customActions);

    customActions.$inject = [];

    function customActions() {

        controllerFunction.$inject = ['$scope', 'dataService', '$timeout'];

        function controllerFunction($scope, dataService, $timeout) {

            // defaults, if blank
            var nextOrderNumbersForActions = {
                gantt: 1,
                list: 101,
                bulk: 201,
                map: 301,
                resource: 401,
                na: 501,
                break: 601
            };

            // nothing to check here, all good
            $scope.verifyFunctions.push(function () {
                return false;
            });

            $scope.settings = dataService.getDraftSettings();
            $scope.selectedSection = "gantt";
            $scope.selectedActionName = null;
            $scope.objectNames = window.fieldNames.CustomGanttAction;
            $scope.actionType = null;
            $scope.actionName = null;

            $scope.getAction = function (name) {
                var actions = dataService.getDraftSettings().CustomGanttActions;

                if (!Array.isArray(actions)) {
                    return null;
                }

                for (var i = 0; i < actions.length; i++) {
                    if (actions[i].Name === name) {
                        return actions[i];
                    }
                }

                return null;
            };

            $scope.iconsCollection = {
                action: ["add_contact", "add_file", "add_photo_video", "add_relationship", "announcement", "apex", "approval", "back", "call", "canvas", "change_owner", "change_record_type", "check", "clone", "close", "defer", "delete", "description", "dial_in", "download", "edit_groups", "edit_relationship", "edit", "email", "fallback", "filter", "flow", "follow", "following", "freeze_user", "goal", "google_news", "info", "join_group", "lead_convert", "leave_group", "log_a_call", "log_event", "manage_perm_sets", "map", "more", "new_account", "new_campaign", "new_case", "new_child_case", "new_contact", "new_event", "new_group", "new_lead", "new_note", "new_notebook", "new_opportunity", "new_person_account", "new_task", "new", "password_unlock", "preview", "priority", "question_post_action", "quote", "recall", "record", "refresh", "reject", "remove_relationship", "remove", "reset_password", "share_file", "share_link", "share_poll", "share_post", "share_thanks", "share", "sort", "submit_for_approval", "update_status", "update", "upload", "user_activation", "user", "view_relationship", "web_link"],
                custom: ["custom1", "custom2", "custom3", "custom4", "custom5", "custom6", "custom7", "custom8", "custom9", "custom10", "custom11", "custom12", "custom13", "custom14", "custom15", "custom16", "custom17", "custom18", "custom19", "custom20", "custom21", "custom22", "custom23", "custom24", "custom25", "custom26", "custom27", "custom28", "custom29", "custom30", "custom31", "custom32", "custom33", "custom34", "custom35", "custom36", "custom37", "custom38", "custom39", "custom40", "custom41", "custom42", "custom43", "custom44", "custom45", "custom46", "custom47", "custom48", "custom49", "custom50", "custom51", "custom52", "custom53", "custom54", "custom55", "custom56", "custom57", "custom58", "custom59", "custom60", "custom61", "custom62", "custom63", "custom64", "custom65", "custom66", "custom67", "custom68", "custom69", "custom70", "custom71", "custom72", "custom73", "custom74", "custom75", "custom76", "custom77", "custom78", "custom79", "custom80", "custom81", "custom82", "custom83", "custom84", "custom85", "custom86", "custom87", "custom88", "custom89", "custom90", "custom91", "custom92", "custom93", "custom94", "custom95", "custom96", "custom97", "custom98", "custom99", "custom100", "custom101", "custom102", "custom103", "custom104", "custom105", "custom106", "custom107", "custom108", "custom109", "custom110", "custom111", "custom112"],
                standard: ["account", "address", "announcement", "answer_best", "answer_private", "answer_public", "approval", "apps_admin", "apps", "article", "asset_relationship", "assigned_resource", "avatar_loading", "avatar", "bot", "business_hours", "calibration", "call_history", "call", "campaign_members", "campaign", "canvas", "carousel", "case_change_status", "case_comment", "case_email", "case_log_a_call", "case_milestone", "case_transcript", "case", "channel_program_history", "channel_program_levels", "channel_program_members", "channel_programs", "client", "cms", "coaching", "connected_apps", "contact_list", "contact", "contract_line_item", "contract", "custom_notification", "custom", "customers", "dashboard", "datadotcom", "default", "document", "drafts", "email_chatter", "email", "empty", "endorsement", "entitlement_process", "entitlement_template", "entitlement", "entity_milestone", "entity", "environment_hub", "event", "feed", "feedback", "file", "flow", "folder", "forecasts", "goals", "group_loading", "groups", "hierarchy", "home", "household", "insights", "investment_account", "lead_insights", "lead_list", "lead", "link", "list_email", "live_chat", "location", "log_a_call", "macros", "maintenance_asset", "maintenance_plan", "marketing_actions", "merge", "metrics", "news", "note", "omni_supervisor", "operating_hours", "opportunity_splits", "opportunity", "orders", "partner_fund_allocation", "partner_fund_claim", "partner_fund_request", "partner_marketing_budget", "partners", "past_chat", "people", "performance", "person_account", "photo", "poll", "portal", "post", "pricebook", "process", "product_consumed", "product_item_transaction", "product_item", "product_request_line_item", "product_request", "product_required", "product_transfer", "product", "question_best", "question_feed", "quick_text", "quip_sheet", "quip", "quotes", "recent", "record", "related_list", "relationship", "report", "resource_absence", "resource_capacity", "resource_preference", "resource_skill", "return_order_line_item", "return_order", "reward", "rtc_presence", "sales_path", "scan_card", "search", "service_appointment", "service_contract", "service_crew_member", "service_crew", "service_report", "service_resource", "service_territory_location", "service_territory_member", "service_territory", "shipment", "skill_entity", "skill_requirement", "skill", "social", "solution", "sossession", "task", "task2", "team_member", "template", "thanks_loading", "thanks", "timesheet_entry", "timesheet", "timeslot", "today", "topic", "topic2", "unmatched", "user", "work_order_item", "work_order", "work_type"],
                utility: ["activity", "ad_set", "add", "adduser", "anchor", "animal_and_nature", "announcement", "answer", "answered_twice", "apex", "approval", "apps", "arrowdown", "arrowup", "attach", "automate", "back", "ban", "block_visitor", "bold", "bookmark", "breadcrumbs", "broadcast", "brush", "bucket", "builder", "call", "campaign", "cancel_file_request", "cancel_transfer", "capslock", "case", "cases", "center_align_text", "change_owner", "change_record_type", "chart", "chat", "check", "checkin", "chevrondown", "chevronleft", "chevronright", "chevronup", "classic_interface", "clear", "clock", "close", "collapse_all", "color_swatch", "comments", "company", "connected_apps", "contract_alt", "contract", "copy_to_clipboard", "copy", "crossfilter", "custom_apps", "cut", "dash", "database", "datadotcom", "dayview", "delete", "deprecate", "description", "desktop_console", "desktop", "dislike", "dock_panel", "down", "download", "edit_form", "edit", "email", "emoji", "end_call", "end_chat", "erect_window", "error", "event", "expand_all", "expand_alt", "expand", "fallback", "favorite", "feed", "file", "filter", "filterList", "flow", "food_and_drink", "forward", "frozen", "full_width_view", "graph", "groups", "help", "hide", "hierarchy", "home", "identity", "image", "inbox", "info_alt", "info", "insert_tag_field", "insert_template", "internal_share", "italic", "jump_to_bottom", "jump_to_top", "justify_text", "kanban", "keyboard_dismiss", "knowledge_base", "layers", "layout", "left_align_text", "left", "level_up", "light_bulb", "like", "link", "list", "listen", "location", "lock", "log_a_call", "logout", "lower_flag", "macros", "magicwand", "mark_all_as_read", "matrix", "merge_field", "merge", "metrics", "minimize_window", "missed_call", "moneybag", "monthlyview", "move", "muted", "new_direct_message", "new_window", "new", "news", "note", "notebook", "notification", "office365", "offline_cached", "offline", "omni_channel", "open_folder", "open", "opened_folder", "outbound_call", "overflow", "package_org_beta", "package_org", "package", "page", "palette", "paste", "pause", "people", "phone_landscape", "phone_portrait", "photo", "picklist", "pin", "pinned", "power", "preview", "priority", "privately_shared", "process", "push", "puzzle", "question_mark", "question", "questions_and_answers", "quick_text", "quotation_marks", "rating", "record_create", "record", "redo", "refresh", "relate", "reminder", "remove_formatting", "remove_link", "replace", "reply_all", "reply", "reset_password", "resource_absence", "resource_capacity", "resource_territory", "retweet", "richtextbulletedlist", "richtextindent", "richtextnumberedlist", "richtextoutdent", "right_align_text", "right", "rotate", "rows", "rules", "salesforce1", "save", "search", "sentiment_negative", "sentiment_neutral", "settings", "setup_assistant_guide", "setup", "share_file", "share_mobile", "share_post", "share", "shield", "shopping_bag", "side_list", "signpost", "smiley_and_people", "sms", "snippet", "socialshare", "sort", "spinner", "standard_objects", "stop", "strikethrough", "success", "summary", "summarydetail", "switch", "symbols", "sync", "table", "tablet_landscape", "tablet_portrait", "tabset", "task", "text_background_color", "text_color", "threedots_vertical", "threedots", "thunder", "tile_card_list", "topic", "touch_action", "trail", "travel_and_places", "trending", "turn_off_notifications", "type_tool", "undelete", "undeprecate", "underline", "undo", "unlock", "unmuted", "up", "upload", "user_role", "user", "video", "voicemail_drop", "volume_high", "volume_low", "volume_off", "warning", "weeklyview", "wifi", "work_order_type", "world", "yubi_key", "zoomin", "zoomout"]
            };

            $scope.resourceApexClasses = [];
            $scope.serviceApexClasses = [];
            $scope.absencesApexClasses = [];
            $scope.visualForcepages = [];
            $scope.customPermissions = [];

            $scope.isActionDisabled = function () {
                return $scope.resourceApexClasses.length === 0 && $scope.serviceApexClasses.length === 0 && $scope.absencesApexClasses.length === 0 && $scope.visualForcepages.length === 0;
            };

            dataService.getSettingsPromise().then(function () {

                var actions = $scope.settings.CustomGanttActions,
                    orderField = $scope.objectNames.Display_Order__c,
                    sectionField = $scope.objectNames.Section__c;

                actions.forEach(function (action) {
                    if (action[orderField] > nextOrderNumbersForActions[action[sectionField]]) {
                        nextOrderNumbersForActions[action[sectionField]] = action[orderField];
                    }
                });
            });

            $scope.selectAction = function (action) {

                if (!action) {
                    $scope.selectedActionName = null;
                    return;
                }

                if ($scope.selectedActionName && !$scope.isActionValid($scope.getAction($scope.selectedActionName))) {
                    return;
                }

                var oldSelected = $scope.getAction($scope.selectedActionName);

                // if there is already a selected action, need to make sure only vf OR class fields are filled
                if ($scope.selectedActionName && oldSelected && oldSelected[$scope.objectNames.Class__c] && oldSelected[$scope.objectNames.Visualforce_Page__c]) {
                    if ($scope.actionType === 'vf') {
                        delete oldSelected[$scope.objectNames.Class__c];
                    } else {
                        delete oldSelected[$scope.objectNames.Visualforce_Page__c];
                    }
                }

                $scope.selectedActionName = action.Name;

                if (action) {
                    $scope.actionType = action[$scope.objectNames.Class__c] ? 'class' : 'vf';
                    $scope.actionName = action[$scope.objectNames.Label__c];
                } else {
                    $scope.actionType = null;
                }
            };

            $scope.isClassOptionDisabled = function () {

                if (!$scope.selectedActionName || !$scope.getAction($scope.selectedActionName)) {
                    return false;
                }

                if ($scope.getAction($scope.selectedActionName)[$scope.objectNames.Section__c] === 'resource') {
                    return $scope.resourceApexClasses.length === 0;
                }

                if ($scope.getAction($scope.selectedActionName)[$scope.objectNames.Section__c] === 'na' || $scope.getAction($scope.selectedActionName)[$scope.objectNames.Section__c] === 'break') {
                    return $scope.absencesApexClasses.length === 0;
                }

                // check for service type
                return $scope.serviceApexClasses.length === 0;
            };

            $scope.isVfOptionDisabled = function () {

                if (!$scope.selectedActionName) {
                    return false;
                }

                return $scope.visualForcepages.length === 0;
            };

            $scope.generateIconUrl = function (sprite, icon) {
                return window.globalIcon + '/' + sprite + '-sprite/svg/symbols.svg#' + icon;
            };

            $scope.generateIconUrlAction = function (action) {
                var _action$$scope$object = action[$scope.objectNames.Icon__c].split(','),
                    _action$$scope$object2 = _slicedToArray(_action$$scope$object, 2),
                    sprite = _action$$scope$object2[0],
                    icon = _action$$scope$object2[1];

                return $scope.generateIconUrl(sprite, icon);
            };

            $scope.getApexClassesArray = function () {

                if (!$scope.selectedActionName || !$scope.getAction($scope.selectedActionName)) {
                    return [];
                }

                var section = $scope.getAction($scope.selectedActionName)[$scope.objectNames.Section__c];

                switch (section) {

                    case 'na':
                    case 'break':
                        return $scope.absencesApexClasses;

                    case 'resource':
                        return $scope.resourceApexClasses;

                    default:
                        return $scope.serviceApexClasses;

                }
            };

            $scope.actionTypeChanged = function (actionType) {

                if ($scope.isClassOptionDisabled() || $scope.isVfOptionDisabled()) {
                    return;
                }

                $scope.actionType = actionType;
                $scope.getAction($scope.selectedActionName).type = actionType;

                if ($scope.actionType === 'class' && !$scope.getAction($scope.selectedActionName)[$scope.objectNames.Class__c] && !$scope.isClassOptionDisabled()) {
                    $scope.getAction($scope.selectedActionName)[$scope.objectNames.Class__c] = $scope.getApexClassesArray()[0].Name;
                }

                if ($scope.actionType === 'vf' && !$scope.getAction($scope.selectedActionName)[$scope.objectNames.Visualforce_Page__c]) {
                    $scope.getAction($scope.selectedActionName)[$scope.objectNames.Visualforce_Page__c] = $scope.visualForcepages[0];
                }
            };

            $scope.isActionValid = function (action) {

                if (action && !action[$scope.objectNames.Label__c]) {
                    alert('You must specify a name to your action');
                    return false;
                }

                return true;
            };

            $scope.updateActionName = function () {
                $scope.getAction($scope.selectedActionName)[$scope.objectNames.Label__c] = $scope.actionName || $scope.getAction($scope.selectedActionName)[$scope.objectNames.Label__c];
            };

            $scope.addNewAction = function () {

                if ($scope.selectedActionName && !$scope.isActionValid($scope.getAction($scope.selectedActionName))) {
                    return;
                }

                var newAction = {};

                newAction[$scope.objectNames.Label__c] = 'My Action';
                newAction[$scope.objectNames.Display_Order__c] = ++nextOrderNumbersForActions[$scope.selectedSection];
                newAction[$scope.objectNames.Icon__c] = 'custom,custom1';
                newAction[$scope.objectNames.Required_Custom_Permission__c] = $scope.customPermissions[0].DeveloperName;
                newAction[$scope.objectNames.Section__c] = $scope.selectedSection;
                newAction[$scope.objectNames.Visualforce_Page__c] = $scope.visualForcepages[0];
                newAction.Name = 'action' + new Date().getTime().toString();

                $scope.settings.CustomGanttActions.push(newAction);
                $scope.selectAction(newAction);
            };

            $scope.changeOrder = function (action, direction) {

                var orderField = $scope.objectNames.Display_Order__c,
                    sectionField = $scope.objectNames.Section__c,
                    currentActions = $scope.settings.CustomGanttActions.filter(function (a) {
                    return a[sectionField] === $scope.selectedSection;
                }),
                    actionIndex = currentActions.findIndex(function (a) {
                    return a === action;
                });

                if (currentActions[actionIndex + direction]) {
                    var oldOrder = currentActions[actionIndex][orderField];

                    currentActions[actionIndex][orderField] = currentActions[actionIndex + direction][orderField];
                    currentActions[actionIndex + direction][orderField] = oldOrder;
                }

                $scope.settings.CustomGanttActions.sort(function (a, b) {
                    if (a[orderField] > b[orderField]) {
                        return 1;
                    }
                    if (a[orderField] < b[orderField]) {
                        return -1;
                    }
                    return 0;
                });
            };

            $scope.deleteAction = function () {

                if (!confirm('Are you sure you want to delete this action?')) {
                    return;
                }

                var customActionsIndex = $scope.settings.CustomGanttActions.findIndex(function (action) {
                    return action === $scope.getAction($scope.selectedActionName);
                }),
                    selectedAction = $scope.settings.CustomGanttActions[customActionsIndex];

                $scope.settings.CustomGanttActions.splice(customActionsIndex, 1);

                if (selectedAction.Id) {
                    $scope.settings.DeleteCustomGanttActions = $scope.settings.DeleteCustomGanttActions || [];
                    $scope.settings.DeleteCustomGanttActions.push(selectedAction);
                }

                $scope.selectAction();
            };

            $scope.updatedIcon = function (collection, sprite) {

                $scope.getAction($scope.selectedActionName)[$scope.objectNames.Icon__c] = null;

                $timeout(function () {
                    $scope.getAction($scope.selectedActionName)[$scope.objectNames.Icon__c] = collection + ',' + sprite;
                });
            };

            // get list of VF pages, custom permissions and classes that implement our interface
            Visualforce.remoting.Manager.invokeAction(remoteActions.getApexClassesAndVisualForce, function (result, ev) {

                $scope.$apply(function () {
                    var _$scope$resourceApexC, _$scope$serviceApexCl, _$scope$absencesApexC;

                    (_$scope$resourceApexC = $scope.resourceApexClasses).push.apply(_$scope$resourceApexC, _toConsumableArray(result.resourceClassesFSL.filter(function (cls) {
                        return cls.Name !== 'SettingsController';
                    })));
                    if ($scope.resourceApexClasses.length === 0) {
                        var _$scope$resourceApexC2;

                        (_$scope$resourceApexC2 = $scope.resourceApexClasses).push.apply(_$scope$resourceApexC2, _toConsumableArray(result.resourceClasses.filter(function (cls) {
                            return cls.Name !== 'SettingsController';
                        })));
                    }
                    $scope.resourceApexClasses.sort(sortApexClasses);

                    (_$scope$serviceApexCl = $scope.serviceApexClasses).push.apply(_$scope$serviceApexCl, _toConsumableArray(result.serviceClasses.filter(function (cls) {
                        return cls.Name !== 'SettingsController';
                    })));
                    if ($scope.serviceApexClasses.length === 0) {
                        var _$scope$serviceApexCl2;

                        (_$scope$serviceApexCl2 = $scope.serviceApexClasses).push.apply(_$scope$serviceApexCl2, _toConsumableArray(result.serviceClassesFSL.filter(function (cls) {
                            return cls.Name !== 'SettingsController';
                        })));
                    }
                    $scope.serviceApexClasses.sort(sortApexClasses);

                    (_$scope$absencesApexC = $scope.absencesApexClasses).push.apply(_$scope$absencesApexC, _toConsumableArray(result.absenceClasses.filter(function (cls) {
                        return cls.Name !== 'SettingsController';
                    })));
                    if ($scope.absencesApexClasses.length === 0) {
                        var _$scope$absencesApexC2;

                        (_$scope$absencesApexC2 = $scope.absencesApexClasses).push.apply(_$scope$absencesApexC2, _toConsumableArray(result.absenceClassesFSL.filter(function (cls) {
                            return cls.Name !== 'SettingsController';
                        })));
                    }
                    $scope.absencesApexClasses.sort(sortApexClasses);

                    result.visualForcePages.forEach(function (page) {
                        return $scope.visualForcepages.push(page.Name);
                    });
                    $scope.visualForcepages.sort();

                    result.customPermissions.forEach(function (cp) {
                        return $scope.customPermissions.push({ DeveloperName: cp.DeveloperName, MasterLabel: cp.MasterLabel });
                    });
                    $scope.customPermissions.sort(function (a, b) {
                        if (a.MasterLabel > b.MasterLabel) {
                            return 1;
                        }
                        if (a.MasterLabel < b.MasterLabel) {
                            return -1;
                        }
                        return 0;
                    });
                });

                function sortApexClasses(a, b) {
                    if (a.Name > b.Name) {
                        return 1;
                    }
                    if (a.Name < b.Name) {
                        return -1;
                    }
                    return 0;
                }
            }, { buffer: true, escape: false, timeout: 120000 });

            // ARRAY.findIndex Polyfill for explorer
            (function () {

                if (!Array.prototype.findIndex) {
                    Object.defineProperty(Array.prototype, 'findIndex', {
                        value: function value(predicate) {
                            // 1. Let O be ? ToObject(this value).
                            if (this == null) {
                                throw new TypeError('"this" is null or not defined');
                            }

                            var o = Object(this),
                                len = o.length >>> 0;

                            if (typeof predicate !== 'function') {
                                throw new TypeError('predicate must be a function');
                            }

                            var thisArg = arguments[1];

                            var k = 0;

                            while (k < len) {
                                var kValue = o[k];
                                if (predicate.call(thisArg, kValue, k, o)) {
                                    return k;
                                }

                                k++;
                            }

                            return -1;
                        },
                        configurable: true,
                        writable: true
                    });
                }
            })();
        }

        var template = '\n\n                <div id="CA-explain-what-is">\n                    Help out your team by adding custom actions to the dispatcher console. Actions can either call an Apex class or open a Visualforce page, and can appear on records in the dispatcher console or in a particular section, like the Gantt. Select an action category to indicate where the action should appear, then create your action. \n                </div>\n\n                <div id="CA-Container" ng-hide="isActionDisabled()">\n                \n                    <div id="CA-GanttSection">\n                        <span>Action Category</span>\n                        <div ng-click="selectedSection = \'gantt\'; selectAction()" ng-class="{caSelected: selectedSection === \'gantt\'}">Gantt <tooltip>Users see Gantt actions by right-clicking a service appointment on the Gantt</tooltip></div>\n                        <div ng-click="selectedSection = \'list\'; selectAction()" ng-class="{caSelected: selectedSection === \'list\'}">Service List <tooltip>Users see service list actions by clicking a service appointment in the service list</tooltip></div>\n                        <div ng-click="selectedSection = \'bulk\'; selectAction()" ng-class="{caSelected: selectedSection === \'bulk\'}">Mass Actions <tooltip>Bulk actions appear above the service list and can be applied to multiple appointments</tooltip></div>\n                        <div ng-click="selectedSection = \'map\'; selectAction()" ng-class="{caSelected: selectedSection === \'map\'}">Map <tooltip>Users see map actions by right-clicking a map polygon</tooltip></div>\n                        <div ng-click="selectedSection = \'resource\'; selectAction()" ng-class="{caSelected: selectedSection === \'resource\'}">Resources <tooltip>Users see resource actions by clicking the details icon to the right of a name in the resource</tooltip></div>\n                        <div ng-click="selectedSection = \'na\'; selectAction()" ng-class="{caSelected: selectedSection === \'na\'}">Non-Availabilities <tooltip>Users see non-availability actions by right-clicking a resource absence of the Non Availability record type in the Gantt</tooltip></div>\n                        <div ng-click="selectedSection = \'break\'; selectAction()" ng-class="{caSelected: selectedSection === \'break\'}">Breaks <tooltip>Users see break actions by right-clicking a resource absence of the Break record type in the Gantt</tooltip></div>\n                    </div>\n                    \n                    \n                    \n                    \n                    \n                    <div id="CA-ActionsList" ng-show="settings.CustomGanttActions">\n                    \n                        <span class="heading-cusac">Active Actions</span>\n                        <div id="CA-newAction" ng-click="addNewAction()">New Action</div>\n                        <div id="CA-MoveUp" ng-show="getAction(selectedActionName)" ng-click="changeOrder(getAction(selectedActionName), -1)"> Move Up</div>\n                        <div id="CA-MoveDown" ng-show="getAction(selectedActionName)" ng-click="changeOrder(getAction(selectedActionName), 1)">Move Down</div>\n                    \n                        <div class="singleCustomAction" \n                            ng-class="{caSelected: getAction(selectedActionName) === action}"\n                            ng-repeat="action in settings.CustomGanttActions track by $index" \n                            ng-show="action[objectNames.Section__c] === selectedSection"\n                            ng-click="selectAction(action)">\n                            \n                                {{ action[objectNames.Label__c]}}\n                            \n                        </div>\n                        \n                        <div id="CA-noActionsyet" ng-show="settings.CustomGanttActions.length === 0">\n                            No actions yet. \n                        </div>\n                        \n                    </div>\n                    \n                    \n                   \n                \n                    <div id="CA-ActionForm" ng-show="getAction(selectedActionName)">\n                    \n                        <div id="CA-delete" ng-click="deleteAction()">Delete Action</div>\n                        \n                        <div class="CA-field-container">\n                            <div>Label in Dispatcher Console</div>\n                            <input class="CA-input-label" type="text" ng-model="actionName" ng-blur="updateActionName()" />\n                        </div>\n                        \n                        <div class="CA-field-container">\n                            <div>Action Type</div>\n                            <div>\n                                <input type="radio" name="CA-actiontype" id="typeClass" value="class" ng-model="actionType" ng-click="actionTypeChanged(\'class\')" ng-disabled="isClassOptionDisabled()" />\n                                <label for="typeClass" ng-click="actionTypeChanged(\'class\')" ng-style="{\'opacity\' : isClassOptionDisabled() ? 0.5 : 1}">Apex Class</label>\n                                \n                                <input type="radio" name="CA-actiontype" id="typeVf" value="vf" ng-model="actionType" ng-click="actionTypeChanged(\'vf\')" ng-disabled="isVfOptionDisabled()" />\n                                <label for="typeVf" ng-click="actionTypeChanged(\'vf\')" ng-style="{\'opacity\' : isVfOptionDisabled() ? 0.5 : 1}">Visualforce</label>\n                            </div>\n                        </div>\n                        \n                        <div class="CA-field-container" ng-class="{csDisabledSection: actionType === \'vf\'}">\n                            <div>Class</div>\n                            <select class="select-setting" ng-model="getAction(selectedActionName)[objectNames.Class__c]" ng-disabled="actionType === \'vf\'">\n                                <option ng-repeat="cls in getApexClassesArray()" value="{{cls.Name}}">{{cls.Name}}</option>\n                            </select>\n                        </div>\n                        \n                        \n                        <div class="CA-field-container" ng-class="{csDisabledSection: actionType === \'class\'}">\n                            <div>Visualforce</div>\n                            \n                            <select class="select-setting" ng-model="getAction(selectedActionName)[objectNames.Visualforce_Page__c]" ng-disabled="actionType === \'class\'">\n                                <option ng-repeat="page in visualForcepages" value="{{page}}">{{page}}</option>\n                            </select>\n                        </div>\n                        \n                        <div class="CA-field-container">\n                            <div>Required Custom Permission <tooltip>Only users with the selected permission can see this action</tooltip></div>\n                            <select class="select-setting" ng-model="getAction(selectedActionName)[objectNames.Required_Custom_Permission__c]">\n                                <option ng-repeat="cp in customPermissions" value="{{cp.DeveloperName}}">{{cp.MasterLabel}}</option>\n                            </select>\n                        </div>\n                        \n                        <div class="CA-field-container">\n                            <div>\n                                Icon \n                                <svg ng-if="getAction(selectedActionName)[objectNames.Icon__c]" aria-hidden="true" class="slds-icon-show"><use xlink:href="{{generateIconUrlAction(getAction(selectedActionName))}}"></use></svg>\n                            </div>\n                            \n                            <div class="CA-iconsContainer">\n                            \n                                <span ng-repeat="(collection, icons) in iconsCollection">\n                                    <span ng-repeat="sprite in icons" aria-hidden="true" ng-click="updatedIcon(collection,sprite)" class="svg-icon-ca-container">\n                                        <svg class="custom-slds-icon">\n                                            <use xlink:href="{{generateIconUrl(collection, sprite)}}"></use>\n                                        </svg>\n                                    </span>\n                                </span>\n                            \n                            </div>\n                        </div>\n                        \n                    </div>\n                \n                </div>\n                \n               \n                <div id="CA-Container-noCustom" ng-show="isActionDisabled()">\n                   You don\u2019t have any Apex classes or Visualforce pages. Create one so you can link it to a custom action. For help, see the <a href="https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_dev_guide.htm" target="_blank">Apex Developer Guide</a> or the <a href="https://developer.salesforce.com/docs/atlas.en-us.pages.meta/pages/pages_intro.htm" target="_blank">Visualforce Developer Guide</a>.\n                </div>\n                \n        ';

        return {
            restrict: 'E',
            scope: {
                verifyFunctions: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').service('dispatcherConsoleUIService', dispatcherConsoleUIService);

    dispatcherConsoleUIService.$inject = ['settingsUtils', 'dataService'];

    function dispatcherConsoleUIService(settingsUtils, dataService) {

        function restore() {

            return dataService.restoreDefaultSettings({
                GeneralConfig: {
                    'Gantt Default Policy': {},
                    'Timezone display mode': {},
                    'Always show local time in tooltip': {},
                    'Show daily utilization in daily view': {},
                    'Show absences on resource map': {},
                    'Use resource skill filter in gantt': {},
                    'Use new filters': {},
                    'Number Of Days To Load On Gantt Init': {},
                    'Minimun Drag Minutes on Gantt': {},
                    'Maximum Travel Time Displayed': {},
                    'Monthly View High Capacity': {},
                    'Monthly View Critical Capacity': {},
                    'Monthly View High Travel': {},
                    'Low Services Duration': {},
                    'Medium Services Utils': {},
                    'Gantt Custom CSS': {},
                    'Gantt Custom JS': {},
                    'Drag Jumps On Gantt': {},
                    'Online Offset In Minutes': {},
                    'Show secondary STMs on gantt': {},
                    'Delta Will Run Every': {},
                    'Bulk Action Buttons Order': {},
                    'Custom Service Lightbox Page': {},
                    'Custom Chatter Lightbox Page': {},
                    'Custom Related Lightbox Page': {},
                    'Custom Account Lightbox Page': {},
                    'Custom Service Lightbox Page 1': {},
                    'Custom Service Lightbox Page 2': {},
                    'Custom Workorder Lightbox Page': {},
                    'Custom WOLI Lightbox Page': {},
                    'Custom Chatter WO Lightbox Page': {},
                    'Custom Chatter WOLI Lightbox Page': {},
                    'WO related Lightbox Page': {},
                    'WOLI related Lightbox Page': {},
                    'Custom Resource Lightbox Page': {},
                    'Custom Resource Chatter Lightbox Page': {},
                    'Custom Resource Related List Page': {},
                    'Custom Resource Lightbox Page 1': {},
                    'Custom Resource Lightbox Page 2': {},
                    'Absence Lightbox Page': {},
                    'Enable Gantt Updates': {},
                    'Allow Admin Gantt Updates': {},
                    'Absence Chatter Lightbox Page': {},
                    'Gantt Chatter Destination': {},
                    'rule validation after delta': {},
                    'rule validation frequency level': {}
                },

                RestoreLogicSettings: ['Default_First_Day_Of_Working_Week__c'],
                LogicSettings: dataService.getDraftSettings().LogicSettings
            });
        }

        function save() {

            dataService.getDraftSettings().CustomGanttActions.forEach(function (action) {

                if (!action.type) {
                    return;
                }

                if (action.type === 'class') {
                    action[fieldNames.CustomGanttAction.Visualforce_Page__c] = null;
                } else {
                    action[fieldNames.CustomGanttAction.Class__c] = null;
                }

                delete action.type;
            });

            return dataService.saveSettings({
                GeneralConfig: {
                    'Gantt Default Policy': dataService.getDraftSettings().GeneralConfig['Gantt Default Policy'],
                    'Timezone display mode': dataService.getDraftSettings().GeneralConfig['Timezone display mode'],
                    'Always show local time in tooltip': dataService.getDraftSettings().GeneralConfig['Always show local time in tooltip'],
                    'Show daily utilization in daily view': dataService.getDraftSettings().GeneralConfig['Show daily utilization in daily view'],
                    'Show absences on resource map': dataService.getDraftSettings().GeneralConfig['Show absences on resource map'],
                    'Use resource skill filter in gantt': dataService.getDraftSettings().GeneralConfig['Use resource skill filter in gantt'],
                    'Use new filters': dataService.getDraftSettings().GeneralConfig['Use new filters'],
                    'Number Of Days To Load On Gantt Init': dataService.getDraftSettings().GeneralConfig['Number Of Days To Load On Gantt Init'],
                    'Minimun Drag Minutes on Gantt': dataService.getDraftSettings().GeneralConfig['Minimun Drag Minutes on Gantt'],
                    'Maximum Travel Time Displayed': dataService.getDraftSettings().GeneralConfig['Maximum Travel Time Displayed'],
                    'Monthly View High Capacity': dataService.getDraftSettings().GeneralConfig['Monthly View High Capacity'],
                    'Monthly View Critical Capacity': dataService.getDraftSettings().GeneralConfig['Monthly View Critical Capacity'],
                    'Monthly View High Travel': dataService.getDraftSettings().GeneralConfig['Monthly View High Travel'],
                    'Low Services Duration': dataService.getDraftSettings().GeneralConfig['Low Services Duration'],
                    'Medium Services Utils': dataService.getDraftSettings().GeneralConfig['Medium Services Utils'],
                    'Gantt Custom CSS': dataService.getDraftSettings().GeneralConfig['Gantt Custom CSS'],
                    'Gantt Custom JS': dataService.getDraftSettings().GeneralConfig['Gantt Custom JS'],
                    'Drag Jumps On Gantt': dataService.getDraftSettings().GeneralConfig['Drag Jumps On Gantt'],
                    'Online Offset In Minutes': dataService.getDraftSettings().GeneralConfig['Online Offset In Minutes'],
                    'Show secondary STMs on gantt': dataService.getDraftSettings().GeneralConfig['Show secondary STMs on gantt'],
                    'Delta Will Run Every': dataService.getDraftSettings().GeneralConfig['Delta Will Run Every'],
                    'Bulk Action Buttons Order': dataService.getDraftSettings().GeneralConfig['Bulk Action Buttons Order'],
                    'Custom Service Lightbox Page': dataService.getDraftSettings().GeneralConfig['Custom Service Lightbox Page'],
                    'Custom Chatter Lightbox Page': dataService.getDraftSettings().GeneralConfig['Custom Chatter Lightbox Page'],
                    'Custom Related Lightbox Page': dataService.getDraftSettings().GeneralConfig['Custom Related Lightbox Page'],
                    'Custom Account Lightbox Page': dataService.getDraftSettings().GeneralConfig['Custom Account Lightbox Page'],
                    'Custom Service Lightbox Page 1': dataService.getDraftSettings().GeneralConfig['Custom Service Lightbox Page 1'],
                    'Custom Service Lightbox Page 2': dataService.getDraftSettings().GeneralConfig['Custom Service Lightbox Page 2'],
                    'Custom Workorder Lightbox Page': dataService.getDraftSettings().GeneralConfig['Custom Workorder Lightbox Page'],
                    'Custom WOLI Lightbox Page': dataService.getDraftSettings().GeneralConfig['Custom WOLI Lightbox Page'],
                    'Custom Chatter WO Lightbox Page': dataService.getDraftSettings().GeneralConfig['Custom Chatter WO Lightbox Page'],
                    'Custom Chatter WOLI Lightbox Page': dataService.getDraftSettings().GeneralConfig['Custom Chatter WOLI Lightbox Page'],
                    'WO related Lightbox Page': dataService.getDraftSettings().GeneralConfig['WO related Lightbox Page'],
                    'WOLI related Lightbox Page': dataService.getDraftSettings().GeneralConfig['WOLI related Lightbox Page'],
                    'Custom Resource Lightbox Page': dataService.getDraftSettings().GeneralConfig['Custom Resource Lightbox Page'],
                    'Custom Resource Chatter Lightbox Page': dataService.getDraftSettings().GeneralConfig['Custom Resource Chatter Lightbox Page'],
                    'Custom Resource Related List Page': dataService.getDraftSettings().GeneralConfig['Custom Resource Related List Page'],
                    'Custom Resource Lightbox Page 1': dataService.getDraftSettings().GeneralConfig['Custom Resource Lightbox Page 1'],
                    'Custom Resource Lightbox Page 2': dataService.getDraftSettings().GeneralConfig['Custom Resource Lightbox Page 2'],
                    'Absence Lightbox Page': dataService.getDraftSettings().GeneralConfig['Absence Lightbox Page'],
                    'Enable Gantt Updates': dataService.getDraftSettings().GeneralConfig['Enable Gantt Updates'],
                    'Allow Admin Gantt Updates': dataService.getDraftSettings().GeneralConfig['Allow Admin Gantt Updates'],
                    'Absence Chatter Lightbox Page': dataService.getDraftSettings().GeneralConfig['Absence Chatter Lightbox Page'],
                    'Gantt Chatter Destination': dataService.getDraftSettings().GeneralConfig['Gantt Chatter Destination'],
                    'Enable Crew Pilot': dataService.getDraftSettings().GeneralConfig['Enable Crew Pilot'] !== undefined ? dataService.getDraftSettings().GeneralConfig['Enable Crew Pilot'] : 0,
                    'rule validation after delta': dataService.getDraftSettings().GeneralConfig['rule validation after delta'],
                    'rule validation frequency level': dataService.getDraftSettings().GeneralConfig['rule validation frequency level']
                },
                LogicSettings: dataService.getDraftSettings().LogicSettings,
                CustomGanttActions: dataService.getDraftSettings().CustomGanttActions,
                DeleteCustomGanttActions: dataService.getDraftSettings().DeleteCustomGanttActions,
                NewMapReports: dataService.getDraftSettings().NewMapReports,
                DeletedMapReports: dataService.getDraftSettings().DeletedMapReports
            });
        }

        return {
            save: save,
            restore: restore,
            loadData: function loadData() {
                return console.info('dispatch console UI sevice');
            }
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('ganttLiveUpdates', ganttLiveUpdates);

    ganttLiveUpdates.$inject = [];

    function ganttLiveUpdates() {

        controllerFunction.$inject = ['$scope', 'primitiveType', 'dataService', 'settingsUtils'];

        function controllerFunction($scope, primitiveType, dataService, settingsUtils) {

            $scope.primitiveType = primitiveType;
            $scope.settings = dataService.getDraftSettings();
            $scope.sharingObjectSettingsStatus = 'Validating';

            $scope.PushTopicProps = ['Optimization_Request__c', 'ServiceResourceCapacity', 'ServiceResource', 'AssignedResource', 'ResourceAbsence', 'ServiceAppointment', 'Time_Dependency__c'];

            $scope.buttonStateLabels = {

                update: 'Update push topics',
                updated: 'Push topics updated',
                validate: 'Validating push topics',
                failed: 'Failed to validate Push Topics for gantt live refresh'
            };

            $scope.sharingObjects = [{
                SharingObjectAPI: "ServiceAppointmentShare",
                SharingObjectName: "Service Appointment",
                Status: 'NotUpdated'
            }, {
                SharingObjectAPI: "ServiceResourceShare",
                SharingObjectName: "Service Resource",
                Status: 'NotUpdated'
            }, {
                SharingObjectAPI: "Optimization_Request__Share",
                SharingObjectName: "Optimization Request",
                Status: 'NotUpdated'
            }];

            $scope.$watch("sharingObjects", function (newValue, oldValue) {
                var privateSettingsCounter = 0;
                for (var i in newValue) {
                    if (newValue[i].Status == 'NotUpdated' || newValue[i].Status == 'ERROR') {
                        return;
                    }

                    if (newValue[i].Status == 'Public') {
                        $scope.sharingObjectSettingsStatus = 'Public';
                        return;
                    }

                    if (newValue[i].Status == 'Private') {
                        privateSettingsCounter++;
                    }
                }

                if (newValue.length == privateSettingsCounter) {
                    $scope.sharingObjectSettingsStatus = 'Private';
                }
            }, true);
        }

        var template = ' \n\n            <div class="section-settings" id="__ganttUpdates">Timed Updates</div>\n            <br>\n            <custom-settings-wrapper is-text="true" primitive-type="primitiveType.number" min="10" max="120" label="\'Seconds between Gantt refreshes\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Delta Will Run Every\']"></custom-settings-wrapper>\n\n            <div class="section-settings" id="__ganttLiveUpdates">Live Updates</div>\n            <br>\n            \n            <div class="alert-warning-banner" ng-show="sharingObjectSettingsStatus == \'Public\'">\n                One of the objects below has public sharing.<br>\n                To enable gantt live updates, set sharing to private for all objects.\n            </div>\n            <br>\n\n            <object-sharing-status-directive ng-repeat="sharingObject in sharingObjects" object-sharing-props="sharingObject"></object-sharing-status-directive>\n            \n            <push-topics-creator-directive push-topics-props="PushTopicProps" button-state-labels="buttonStateLabels" push-topics-tool-tip="Gantt Live Refresh relies on push topic objects that query for changes made for the relevant objects. The push topic updates are created with a script upon installation. In some cases, such as when creating a sandbox from an instance with the package installed, the push topics aren\u2019t created. Click Update push topics to create the push topics."></push-topics-creator-directive>\n\n            <custom-settings-wrapper is-disabled="sharingObjectSettingsStatus != \'Private\'" primitive-type="primitiveType.booleanText" label="\'Gantt Updates are enabled org wide\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Enable Gantt Updates\']" tooltip-text="After you enable the Gantt Updates org wide, you must add the Streaming API custom permission to the users."></custom-settings-wrapper>\n            <custom-settings-wrapper is-disabled="sharingObjectSettingsStatus != \'Private\'" primitive-type="primitiveType.booleanText" label="\'Allow admins to use Gantt Updates\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Allow Admin Gantt Updates\']" tooltip-text="If too many updates are sent to the gantt it may crash. Admins have access to all records, regardless of sharing. Ensure all admins know the risks."></custom-settings-wrapper>\n        ';

        return {
            restrict: 'E',
            scope: {},
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('schedulingDispatcherUi', schedulingDispatcherUi);

    schedulingDispatcherUi.$inject = [];

    function schedulingDispatcherUi() {

        controllerFunction.$inject = ['$scope', 'primitiveType', 'dataService', 'settingsUtils'];

        function controllerFunction($scope, primitiveType, dataService, settingsUtils) {

            // nothing to check here, all good
            $scope.verifyFunctions.push(function () {
                return false;
            });

            $scope.primitiveType = primitiveType;
            $scope.settings = dataService.getDraftSettings();

            $scope.chatterPostDestionation = [{ label: 'Service Appointment Feed', value: 'sa' }, { label: 'Parent Record Feed', value: 'wo' }];

            $scope.startOfWeek = [{ label: 'Sunday', value: 'Sunday' }, { label: 'Monday', value: 'Monday' }];

            $scope.frequencyLevel = [{ label: 'On Demand', value: 'On Demand' }, { label: 'After Direct Gantt Updates', value: 'After Updates' }, { label: 'Always', value: 'Always' }];

            $scope.timezoneMode = [{ label: 'User Timezone', value: 'user' }, { label: 'Territory Timezone', value: 'location' }];

            $scope.initialLoad = [{ label: 'Selected View ± 0', value: '0' }, { label: 'Selected View ± 1', value: '1' }, { label: 'Selected View ± 2', value: '2' }, { label: 'Selected View ± 3', value: '3' }];

            dataService.getSettingsPromise().then(function () {
                $scope.schedulingPolicies = dataService.policies;
            });

            $scope.isActivateRunning = false;
            $scope.canActivaeReadonly = function () {
                return $scope.settings && $scope.settings.GeneralConfig && $scope.settings.GeneralConfig["Ignore Readonly Gantt CP"][fieldNames.General_Config__c.Value__c] === '1';
            };

            $scope.activeGanttReadonly = function () {

                if (!$scope.canActivaeReadonly()) {
                    return;
                }

                if ($scope.isActivateRunning) {
                    return;
                }

                if (!confirm('Activate extended permissions?\nBefore you continue, add permissions to users. If you don’t, the Gantt is permanently read-only, and you can’t undo it. ')) {
                    return;
                }

                $scope.isActivateRunning = true;

                settingsUtils.callRemoteAction(remoteActions.upsertCustomPermissionsToSupportGanttCustomizations).then(function (result) {

                    if (result) {

                        settingsUtils.callRemoteAction(remoteActions.updateReadonly226CustomSetting).then(function (csNewValue) {
                            $scope.settings.GeneralConfig[csNewValue.Name] = csNewValue[fieldNames.General_Config__c.Value__c];
                            $scope.isActivateRunning = false;
                            dataService.getLastFetchedSettings().GeneralConfig[csNewValue.Name] = csNewValue[fieldNames.General_Config__c.Value__c];
                        });
                    }
                }).catch(function (ex) {
                    console.log(ex);
                });
            };

            // $scope.preventChangingNewFiltersBackToOld = (e) => {
            //
            //     if ($scope.settings.GeneralConfig['Use new filters'].Value__c === '1') {
            //         e.preventDefault();
            //         e.stopPropagation();
            //     }
            //
            //     return;
            //
            // };
        }

        var template = '\n            <custom-settings-wrapper id="__configure" primitive-type="primitiveType.picklist" options="schedulingPolicies" label="\'Default scheduling policy\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Gantt Default Policy\']" tooltip-text=\'The default policy for the dispatcher console and the auto-schedule function\'></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.picklist" options="timezoneMode" label="\'Gantt chart timezone\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Timezone display mode\']" tooltip-text="Select between the logged-in user\'s or each service territories timezone"></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.booleanText" label="\'Show secondary Service Territory Members on Gantt chart\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Show secondary STMs on gantt\']" tooltip-text="If checked, secondary STMs are displayed on the gantt chart. Notice - if service territory timezone view is selected, only secondary territories with same timezone as primary territory will be shown"></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.booleanText" label="\'Show local time in Gantt chart tooltip\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Always show local time in tooltip\']" tooltip-text="If checked, the appointments local start and finish times are shown in the tooltip."></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.booleanText" label="\'Show utilization on the Gantt\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Show daily utilization in daily view\']" tooltip-text="Show each territory\'s average daily utilization on the Gantt for all Gantt resolutions. If this option isn\'t selected, utilization information is shown only when the Gantt resolution is set to Utilization."></custom-settings-wrapper>\n            \n            <custom-settings-wrapper primitive-type="primitiveType.booleanText" label="\'Enable resource filtering by skills in dispatcher console\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Use resource skill filter in gantt\']" tooltip-text="It is recommended to disable the Resource Skills filter on the Gantt if you have more than 200 skills defined in your org to improve the Dispatcher console performance"></custom-settings-wrapper>\n\n            <custom-settings-wrapper primitive-type="primitiveType.booleanText" label="\'Enable Custom Filters\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Use new filters\']" tooltip-text="Use Gantt Filter object with more complex options such as criterias, logics and dynamic time frames in the dispatcher console when filtering service appointments on the appointments list"></custom-settings-wrapper>\n            \n            <custom-settings-wrapper primitive-type="primitiveType.picklist" options="startOfWeek" label="\'Gantt chart week start\'" value-field-name="\'Default_First_Day_Of_Working_Week__c\'" setting="settings.LogicSettings" tooltip-text="First day of the week, Sunday versus Monday"></custom-settings-wrapper>\n            \n            <custom-settings-wrapper primitive-type="primitiveType.picklist" options="initialLoad" label="\'Initial Gantt loading days boundaries\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Number Of Days To Load On Gantt Init\']" tooltip-text="Control how many extra days will be loaded to the Gantt on top of the selected view upon Gantt loading. Selecting to load additional days will improve the user experience when navigating through next and previous days, but may lead to hit platform limits for large data sets."></custom-settings-wrapper>\n            \n            <custom-settings-wrapper is-text="true" primitive-type="primitiveType.number" min="1" max="60" label="\'Drag jumps on gantt\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Drag Jumps On Gantt\']" tooltip-text="When dragging services on the gantt, this will be the amount of minutes they move"></custom-settings-wrapper>\n\n            <custom-settings-wrapper is-text="true" primitive-type="primitiveType.number" min="1" max="200" label="\'Maximum travel hours displayed on gantt\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Maximum Travel Time Displayed\']" tooltip-text="If travel time is longer than this number, it will be hidden from the Gantt"></custom-settings-wrapper>\n            \n            <custom-settings-wrapper is-text="true" primitive-type="primitiveType.number" min="1" max="9999" label="\'Online Offset In Minutes\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Online Offset In Minutes\']" tooltip-text="For how many minutes from the last seen does the resource considered online"></custom-settings-wrapper>\n            \n            \n            \n            \n            <custom-settings-wrapper primitive-type="primitiveType.picklist" options="chatterPostDestionation" label="\'Gantt Chatter Post Destination\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Gantt Chatter Destination\']" tooltip-text="Select where to post service appointment Chatter messages that are written from the Gantt."></custom-settings-wrapper>\n            \n            \n            \n            \n            \n            <custom-settings-wrapper primitive-type="primitiveType.booleanText" label="\'Show absences on resource map\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Show absences on resource map\']" tooltip-text="If checked, geocoded absences will be showed on the resource map"></custom-settings-wrapper>\n            \n            <bulk-actions-order object="settings.GeneralConfig"></bulk-actions-order> \n\n\n            <div class="section-settings" id="__customize">\n                Rules Validation\n                <a href="https://help.salesforce.com/articleView?id=sf.pfs_manage_rule_validations.htm&type=5" class="activateLink" style="float:right;font-size:13px;" target="_blank">Learn More</a>\n            </div>\n\n            <div style=margin-left: 6px;>Set how often rules are checked for violations, and what triggers rule validation checks</div>\n\n            <custom-settings-wrapper primitive-type="primitiveType.booleanText" label="\'Validate rules after indirect Gantt updates\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'rule validation after delta\']"></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.picklist" options="frequencyLevel" label="\'Rule Validation Frequency\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'rule validation frequency level\']" tooltip-text="How often the rules are checked"></custom-settings-wrapper>\n\n            <div class="section-settings" id="__monthly">Utilization Views</div>\n            <custom-settings-wrapper is-text="true" primitive-type="primitiveType.number" min="1" max="1000" label="\'High utilization(%)\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Monthly View Critical Capacity\']" tooltip-text="High utilization will be colored in shades of Red"></custom-settings-wrapper>\n            <custom-settings-wrapper is-text="true" primitive-type="primitiveType.number" min="1" max="1000" label="\'Medium utilization(%)\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Monthly View High Capacity\']" tooltip-text="Medium utilization will be colored in shades of Yellow"></custom-settings-wrapper>\n            <custom-settings-wrapper is-text="true" primitive-type="primitiveType.number" min="1" max="10000" label="\'Extensive travel alert\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Monthly View High Travel\']" tooltip-text="An extensive travel icon will appear when traveling more than this percentage"></custom-settings-wrapper>\n            \n            \n            <div class="section-settings" id="__calendar">Resource Calendar</div>\n            <custom-settings-wrapper is-text="true" primitive-type="primitiveType.number" min="1" max="10000" label="\'Medium utilization (hours)\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Medium Services Utils\']" tooltip-text="Number of hours which reflect medium utilization"></custom-settings-wrapper>\n            <custom-settings-wrapper is-text="true" primitive-type="primitiveType.number" min="1" max="10000" label="\'Low utilization (hours)\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Low Services Duration\']" tooltip-text="Number of hours which reflect low utilization"></custom-settings-wrapper>\n            \n\n            <div class="section-settings" id="__calendar">Extended Custom Permissions</div>\n            <div ng-click="activeGanttReadonly()" class="blueButton activate-readonly-gantt" ng-class="{\'activate-disabled-button-gantt\': isActivateRunning, \'active-button-gantt\': !isActivateRunning && !canActivaeReadonly()}">\n                <span ng-if="!isActivateRunning && canActivaeReadonly()">Activate</span>\n                <span ng-if="!isActivateRunning && !canActivaeReadonly()">Active</span>\n                <span ng-if="isActivateRunning">Activating...</span>\n            </div>\n            <div>\n                These optional permissions restrict access to a few dispatcher console features. \n                <br/><b>IMPORTANT:</b> Assign permissions to users before you activate them. Otherwise, the Gantt is permanently read-only, and you can\u2019t undo activation. \n            </div>\n            \n\n            \n            <div class="section-settings" id="__customize">Dispatcher View Customizations</div>\n            <custom-settings-wrapper primitive-type="primitiveType.text" label="\'External CSS\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Gantt Custom CSS\']" tooltip-text="External CSS Load an additional CSS file (static resource name)"></custom-settings-wrapper>            \n            <custom-settings-wrapper primitive-type="primitiveType.text" label="\'External JS\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Gantt Custom JS\']" tooltip-text="Load an additional JS file (static resource name)"></custom-settings-wrapper>\n            \n            <content-collapse-wrapper header="\'Service VisualForce pages\'" open="false">\n                <content>\n                    <custom-settings-wrapper primitive-type="primitiveType.text" label="\'Service - Main Tab\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Custom Service Lightbox Page\']" tooltip-text="The main page displayed when opening the Service"></custom-settings-wrapper>\n                    <custom-settings-wrapper primitive-type="primitiveType.text" label="\'Service - Chatter Tab\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Custom Chatter Lightbox Page\']" tooltip-text="The chatter tab displayed on the service VisualForce"></custom-settings-wrapper>\n                    <custom-settings-wrapper primitive-type="primitiveType.text" label="\'Service - Related List Tab\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Custom Related Lightbox Page\']" tooltip-text="The related tabs displayed on the service VisualForce"></custom-settings-wrapper>\n                    <custom-settings-wrapper primitive-type="primitiveType.text" label="\'Service - Account Tab\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Custom Account Lightbox Page\']" tooltip-text="The account tab displayed on the service VisualForce"></custom-settings-wrapper>\n                    <custom-settings-wrapper primitive-type="primitiveType.text" label="\'Service - Custom Tab 1\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Custom Service Lightbox Page 1\']" tooltip-text="Define a custom page to be shown on the service lightbox"></custom-settings-wrapper>\n                    <custom-settings-wrapper primitive-type="primitiveType.text" label="\'Service - Custom Tab 2\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Custom Service Lightbox Page 2\']" tooltip-text="Define a custom page to be shown on the service lightbox"></custom-settings-wrapper>\n                </content>\n            </content-collapse-wrapper>\n            \n            <content-collapse-wrapper header="\'Work Order VisualForce pages\'" open="false">\n                <content>\n                    <custom-settings-wrapper primitive-type="primitiveType.text" label="\'Work Order - Main Tab\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Custom Workorder Lightbox Page\']" tooltip-text="The work order details tab on the service lightbox"></custom-settings-wrapper>\n                    <custom-settings-wrapper primitive-type="primitiveType.text" label="\'Work Order Line Item - Main Tab\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Custom WOLI Lightbox Page\']" tooltip-text="The work order line itemdetails tab on the service lightbox"></custom-settings-wrapper>\n                    <custom-settings-wrapper primitive-type="primitiveType.text" label="\'Work Order - Chatter Tab\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Custom Chatter WO Lightbox Page\']" tooltip-text="The work order chatter tab on the service lightbox"></custom-settings-wrapper>\n                    <custom-settings-wrapper primitive-type="primitiveType.text" label="\'Work Order Line Item - Chatter Tab\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Custom Chatter WOLI Lightbox Page\']" tooltip-text="The work order line item chatter tab on the service lightbox"></custom-settings-wrapper>\n                    <custom-settings-wrapper primitive-type="primitiveType.text" label="\'Work Order - Related List Tab\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'WO related Lightbox Page\']" tooltip-text="The work order related list tab on the service lightbox"></custom-settings-wrapper>\n                    <custom-settings-wrapper primitive-type="primitiveType.text" label="\'Work Order Line Item - Related List Tab\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'WOLI related Lightbox Page\']" tooltip-text="The work order line item related list tab on the service lightbox"></custom-settings-wrapper>\n                </content>\n            </content-collapse-wrapper>\n            \n            <content-collapse-wrapper header="\'Resource VisualForce pages\'" open="false">\n                <content>\n                    <custom-settings-wrapper primitive-type="primitiveType.text" label="\'Resource - Main Tab\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Custom Resource Lightbox Page\']" tooltip-text="The main page displayed when opening the resource VisualForce page"></custom-settings-wrapper>\n                    <custom-settings-wrapper primitive-type="primitiveType.text" label="\'Resource - Chatter Tab\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Custom Resource Chatter Lightbox Page\']" tooltip-text="The chatter tab displayed on the resource VisualForce page"></custom-settings-wrapper>\n                    <custom-settings-wrapper primitive-type="primitiveType.text" label="\'Resource - Related List Tab\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Custom Resource Related List Page\']" tooltip-text="The related tabs displayed on the resource VisualForce page"></custom-settings-wrapper>\n                    <custom-settings-wrapper primitive-type="primitiveType.text" label="\'Resource - Custom Tab 1\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Custom Resource Lightbox Page 1\']" tooltip-text="Define a custom page to be shown on the resource lightbox"></custom-settings-wrapper>\n                    <custom-settings-wrapper primitive-type="primitiveType.text" label="\'Resource - Custom Tab 2\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Custom Resource Lightbox Page 2\']" tooltip-text="Define a custom page to be shown on the resource lightbox"></custom-settings-wrapper>\n                </content>\n            </content-collapse-wrapper>\n            \n            <content-collapse-wrapper header="\'Employee Absences VisualForce pages\'" open="false">\n                <content>\n                    <custom-settings-wrapper primitive-type="primitiveType.text" label="\'Employee Absences - Main Tab\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Absence Lightbox Page\']" tooltip-text="The main page displayed when opening the employee absence VisualForce page"></custom-settings-wrapper>\n                    <custom-settings-wrapper primitive-type="primitiveType.text" label="\'Employee Absences - Chatter Tab\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Absence Chatter Lightbox Page\']" tooltip-text="The chatter tab displayed on the employee absence VisualForce page"></custom-settings-wrapper>\n                </content>\n            </content-collapse-wrapper>\n        ';

        return {
            restrict: 'E',
            scope: {
                verifyFunctions: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('gettingStartedGettingStarted', gettingStartedGettingStarted);

    gettingStartedGettingStarted.$inject = [];

    function gettingStartedGettingStarted() {

        controllerFunction.$inject = ['$scope', 'dataService', 'settingsUtils', '$rootScope', 'permissionSetService', '$q', '$window'];

        function controllerFunction($scope, dataService, settingsUtils, $rootScope, permissionSetService, $q, $window) {

            $scope.isLoading = false;
            $scope.isDisabled = false;
            $scope.buttonText = 'Go to Guided Setup';
            $scope.errorText;

            $scope.permissionsMap = { "FSL_Dispatcher": { Name: 'FSL_Dispatcher',
                    Label: 'Field Service Dispatcher',
                    License: 'FieldServiceDispatcher',
                    Img: 'dispatcher',
                    Msg: 'Permissions to view and use the dispatcher console, global actions and their related objects, and schedule, optimize, and dispatch service appointments.',
                    Validated: null,
                    ErrorMsg: '' },
                "FSL_Resource": { Name: 'FSL_Resource',
                    Label: 'Field Service Resource',
                    License: 'FieldServiceScheduling',
                    Img: 'resource',
                    Msg: 'Permissions to view and manage service appointments and their related parent objects.',
                    Validated: null,
                    ErrorMsg: '' },
                "FSL_Agent": { Name: 'FSL_Agent',
                    Label: 'Field Service Agent',
                    License: 'FieldServiceStandard',
                    Img: 'agent',
                    Msg: 'Permissions to view all global actions and their related objects to create, book, and schedule service appointments.',
                    Validated: null,
                    ErrorMsg: '' },
                "FSL_Community_Self_Service": { Name: 'FSL_Community_Self_Service',
                    Label: 'Field Service Self Service',
                    License: 'FieldServiceStandard',
                    Img: 'community',
                    Msg: 'Permissions for community users to view all global actions and their related objects to create, book, and schedule their own appointments.',
                    Validated: null,
                    ErrorMsg: '' },
                "FSL_Community_Dispatcher": { Name: 'FSL_Community_Dispatcher',
                    Label: 'Field Service Community Dispatcher',
                    License: 'FieldServiceDispatcher',
                    Img: 'dispatchercommunity',
                    Msg: '',
                    Validated: null,
                    ErrorMsg: '' },
                "FSL_Admin": { Name: 'FSL_Admin',
                    Label: 'Field Service Admin',
                    License: 'FieldServiceStandard',
                    Img: 'admin',
                    Msg: 'Permissions to access and manage all Field Service objects including the \'Field Service Admin\' app, Field Service Visualforce pages, and logic services.',
                    Validated: null,
                    ErrorMsg: '' }
            };

            $scope.getIcon = function (name) {
                return settings.icons[name];
            };

            $scope.createAllPermissionsAndGoToOnboardingWizard = function () {
                $scope.isLoading = true;
                $scope.buttonText = 'Checking permission sets...';

                $q.all([settingsUtils.callRemoteAction(remoteActions.validatePS, ['FSL_Dispatcher']), settingsUtils.callRemoteAction(remoteActions.validatePS, ['FSL_Resource']), settingsUtils.callRemoteAction(remoteActions.validatePS, ['FSL_Agent']), settingsUtils.callRemoteAction(remoteActions.validatePS, ['FSL_Community_Self_Service']), settingsUtils.callRemoteAction(remoteActions.validatePS, ['FSL_Community_Dispatcher']), settingsUtils.callRemoteAction(remoteActions.validatePS, ['FSL_Admin'])]).then(function (results) {

                    for (var i = 0; i < results.length; i++) {
                        var name = results[i].psName;

                        if (results[i].PSStatus === 'Updated') {
                            permissionSetService.createTabAndRecordTypePermission(name, $scope.permissionsMap[name].Label, results[i].tabSettingsMap, results[i].recordTypeVisibilitiesMap, results[i].apexClassesMap);
                        } else {

                            // update permission only if not opt out of auto update
                            if (!dataService.getDraftSettings().PerventPermissionsUpdate) {
                                permissionSetService.createPermission(name, $scope.permissionsMap[name].Label, $scope.permissionsMap[name].License);
                            }
                        }
                    }

                    if (!isUserAdmin) {
                        alert("You're missing some permissions\nAsk your admin to assign the Field Service Admin Permissions permission set to you. Otherwise, you may have trouble accessing the features you're setting up.");

                        $scope.buttonText = 'Go to Guided Setup';
                        $scope.isLoading = false;
                        $scope.isDisabled = true;
                        $scope.errorText = 'Missing permissions.';

                        return;
                    } else {
                        $scope.buttonText = 'Redirecting to Guided Setup';
                        goToOnboarding();
                    }
                }).catch(function (res) {
                    console.error(res);
                    $scope.buttonText = 'Go to Guided Setup';
                    $scope.isLoading = false;
                    $scope.isDisabled = true;
                    $scope.errorText = 'Something went wrong.';
                });
            };

            // not in use - we do not assign Admin perms on our own.
            // function assignAdmin() {

            //     permissionSetService.assignAdminToUser().then(res => {
            //         $scope.buttonText = 'Redirecting to Guided Setup';
            //         goToOnboarding();
            //     })
            //         .catch( res => {
            //             $scope.buttonText = 'Something went wrong';
            //             $scope.isLoading = false;
            //         });
            // }

            function goToOnboarding() {

                if (sforce && sforce.one) {
                    sforce.one.navigateToURL(settings.onBoardingLink);
                    return;
                }

                location.href = encodeURI(window.location.origin + '/' + settings.onBoardingLink);
            }
        }

        var template = '\n            <h1>Ramp Up Fast with Guided Setup</h1>\n\n            Quickly set up and get to know the core elements of Field Service so you can get started booking appointments! Start by creating your service territories and operating hours. Then, define your work types and skills. Next, create service resources, dispatchers, and agents and assign permission sets. Last, customize your appointment booking settings and scheduling policies. You can revisit Guided Setup at any time to manage your records and settings.\n            \n            <button ng-click="createAllPermissionsAndGoToOnboardingWizard()" ng-disabled="isDisabled" class="slds-button slds-button_neutral ob-link">\n                <div ng-show="isLoading">\n                    <img class="loadingImg"  src={{getIcon(\'loading\')}} />\n                </div>\n                <span ng-bind="buttonText"></span>\n            </button>\n            <div class="ob-errorMsg" ng-show="errorText">\n                <svg class="slds-button__icon" aria-hidden="true" style="top: -2px; position: relative;"> \n                    <use xlink:href="' + settings.icons.warning + '"/>\n                </svg>\n                {{errorText}}\n            </div>\n            \n            <img class="gantt-pic" src="' + settings.ganttPic + '" /><br/>\n        ';

        return {
            restrict: 'E',
            scope: {
                verifyFunctions: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').service('gettingStartedService', gettingStartedService);

    gettingStartedService.$inject = ['dataService'];

    function gettingStartedService(dataService) {

        return {
            save: function save() {
                return dataService.saveSettings({
                    TriggerConfigurations: {
                        'Mention user on service dispatch': dataService.getDraftSettings().TriggerConfigurations['Mention user on service dispatch']
                    },
                    DripFeedConfig: dataService.getDraftSettings().DripFeedConfig,
                    // need all 3 for automators to save
                    AutomatorConfig: dataService.getAutomatorsMap('Sched007_ServicesAppoDispatched'),
                    DeletedAutomators: dataService.getDraftSettings().DeletedAutomators,
                    Territories: dataService.getDraftSettings().Territories,
                    manyTerritories: dataService.getDraftSettings().manyTerritories
                });
            },
            restore: function restore() {
                return dataService.restoreDefaultSettings({
                    TriggerConfigurations: {
                        'Mention user on service dispatch': {}
                    },
                    DripFeedConfig: dataService.getDraftSettings().DripFeedConfig,
                    RestoreAutomatorSettings: ['Sched007_ServicesAppoDispatched']
                });
            },
            loadData: function loadData() {
                return console.info('dispatchService - Loading settings');
            }
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('healthCheck', healthCheck);

    healthCheck.$inject = [];

    function healthCheck() {

        controllerFunction.$inject = ['$scope', '$rootScope'];

        function controllerFunction($scope, $rootScope) {
            $scope.healthCheckLink = settings.healthCheckLink;

            var data = {
                targetOrigin: undefined,
                iframeWindow: undefined
            };

            $scope.bindEvent = function (element, eventName, eventHandler) {
                if (element.addEventListener) {
                    element.addEventListener(eventName, eventHandler);
                } else if (element.attachEvent) {
                    element.attachEvent('on' + eventName, eventHandler);
                }
            };

            $scope.messageHandler = function (message) {
                if (message.data.type == 'switchTab') {
                    $scope.$parent.$parent.$parent.settings.switchPageAndTab({}, settings.menu[message.data.tab], settings.menu[message.data.tab].items[message.data.sub], message.data.tab, message.data.sub);
                    $rootScope.$digest();
                }
            };

            data.targetOrigin = window.location.origin + window.location.pathname;
            data.iframeWindow = document.getElementById("healthCheck").contentWindow;
            $scope.bindEvent(window, 'message', $scope.messageHandler);
        }

        var template = '\n            <iframe id="healthCheck" class="health-check-frame" ng-src="{{healthCheckLink}}" />\n        ';

        return {
            restrict: 'E',
            scope: {
                verifyFunctions: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('permissionSet', permissionSet);

    permissionSet.$inject = [];

    function permissionSet() {

        controllerFunction.$inject = ['$scope', '$q', 'settingsUtils', 'permissionSetService'];

        function controllerFunction($scope, $q, settingsUtils, permissionSetService) {

            $scope.isLoading = true;
            $scope.sessionId = sessionId;
            $scope.showBlink = 0;

            var TabOptions = ['Visible', 'Available', 'None'];

            $scope.getImage = function () {
                return settings.images[$scope.settings.Img];
            };

            $scope.createPermission = function (createOrUpdate) {
                $scope.isLoading = true;

                permissionSetService.createPermission($scope.settings.Name, $scope.settings.Label, $scope.settings.License, createOrUpdate).then(function (res) {
                    $scope.isLoading = res.isLoading;
                    $scope.settings.Validated = res.Validated;
                    $scope.settings.ErrorMsg = res.errorMsg;
                }).catch(function (res) {
                    $scope.isLoading = res.isLoading;
                    $scope.settings.Validated = res.Validated;
                });
            };

            $scope.getIcon = function (name) {
                return settings.icons[name];
            };

            $scope.showWarning = function () {
                alert($scope.settings.ErrorMsg);
            };

            settingsUtils.callRemoteAction(remoteActions.validatePS, [$scope.settings.Name]).then(function (result) {
                if (result.PSStatus == 'Updated') {
                    permissionSetService.validateTabAndRecordTypePermission($scope.settings.Name, result.tabSettingsMap, result.recordTypeVisibilitiesMap, result.apexClassesMap).then(function (res) {
                        $scope.settings.Validated = res.Validated;
                        $scope.isLoading = false;
                    }).catch(function (result) {
                        $scope.$parent.$parent.topError = result.msg;
                        $scope.settings.Validated = 'ERROR';
                        $scope.isLoading = false;
                    });
                } else {
                    $scope.settings.Validated = result.PSStatus;
                    $scope.isLoading = false;
                }
            }).catch(function (result) {
                $scope.settings.Validated = 'ERROR';
                $scope.isLoading = false;
            });
        }

        var template = '\n            <div class="permissionSet">\n                <div ng-show="showBlink > 10 && settings.Label == \'Field Service Dispatcher\'" class="blinking"></div>\n                <img class="permissionImage" ng-src="{{getImage()}}" ng-click="showBlink = showBlink + 1">\n                    <h1>{{settings.Label}}</h1>\n                <div class="desc">\n                    {{settings.Msg}}\n                </div>\n                <div ng-show="isLoading" class="permissionsLoadingContainer">\n                    <img class="loadingImg"  src={{getIcon(\'loading\')}} />\n                </div>\n                <div ng-show="settings.Validated == \'Updated\'" class="permissionSetOK">Permission set is up to date</div>\n                <div ng-click="createPermission(settings.Validated)" ng-show="settings.Validated == \'NotUpdated\'" class="settingsButton blueButton">Update Permissions</div>\n                <div ng-click="createPermission(settings.Validated)" ng-show="settings.Validated == \'NotExist\'" class="settingsButton blueButton">Create Permissions</div>\n                <div ng-show="settings.Validated == \'ERROR\'" class="permissionSetERROR">An error has occurred</div>\n                <div  ng-show="settings.Validated == \'PartialError\'" class="permissionSetERROR">An error has occurred\n                    <span ng-click="showWarning()" class="error-more-details">More details</span>\n                </div>\n                <div ng-show="settings.Validated == \'LicenseError\'" class="permissionSetERROR">Missing matching license</div>\n            </div>';

        return {
            restrict: 'E',
            scope: {
                settings: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').service('permissionSetService', permissionSetService);

    permissionSetService.$inject = ['settingsUtils', '$http', '$q'];

    function permissionSetService(settingsUtils, $http, $q) {

        function createPermission(name, label, license, createOrUpdate) {
            var deferred = $q.defer();
            createPermissionSoapRequest(name, createOrUpdate == 'NotExist').then(function () {
                settingsUtils.callRemoteAction(remoteActions.createAndUpdatePermissionSet, [name, label, license]).then(function (result) {

                    if (result.PSStatus == 'PartialError') {
                        deferred.resolve({
                            Validated: result.PSStatus,
                            isLoading: false,
                            errorMsg: result.errorMsg
                        });
                    } else {
                        if (result.tabSettings.length != 0 || result.recordTypeVisibilities.length != 0 || result.apexClasses.length != 0) {
                            createTabAndRecordTypePermission(name, label, result.tabSettings, result.recordTypeVisibilities, result.apexClasses).then(function (res) {
                                deferred.resolve({
                                    Validated: res.Validated,
                                    isLoading: res.isLoading
                                });
                            });
                        } else {
                            deferred.resolve({
                                Validated: result.PSStatus,
                                isLoading: false
                            });
                        }
                    }
                }, function (res) {
                    deferred.reject({
                        Validated: 'ERROR',
                        isLoading: false
                    });
                });
            });

            return deferred.promise;
        }

        function validateTabAndRecordTypePermission(permissionName, tabSettingsMap, recordTypeVisibilitiesMap, apexClassesMap) {
            var deferred = $q.defer();
            var parser = new DOMParser();

            var baseUrl = window.location.origin;
            var psFullName = permissionName != 'sfdc_fieldservice' ? permissionName + '_Permissions' : permissionName;

            //in scratch orgs when project is deploye we need to add NS. why? no idea...
            var nsPrefix = isOrgInManagedPackageContext ? '' : 'FSL__';

            var dataStr = '<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:met="http://soap.sforce.com/2006/04/metadata"> \n                            <soapenv:Header> \n                                <met:SessionHeader> \n                                    <met:sessionId>' + sessionId + '</met:sessionId> \n                                </met:SessionHeader> \n                            </soapenv:Header> \n                            <soapenv:Body> \n                            <met:readMetadata>\n                                <metadataType>PermissionSet</metadataType>\n                                <fullName>' + nsPrefix + psFullName + '</fullName>\n                            </met:readMetadata>\n                            </soapenv:Body> \n                          </soapenv:Envelope>';

            $http.post(baseUrl + '/services/Soap/m/50.0', dataStr, { headers: { 'SOAPAction': '""',
                    'Content-Type': 'text/xml',
                    contentType: "text/xml" }
            }).then(function (res) {
                var xmlDoc = parser.parseFromString(res.data, "text/xml");
                if (validateTabVisibilityAndRecordType(xmlDoc, tabSettingsMap, recordTypeVisibilitiesMap, apexClassesMap)) {
                    deferred.resolve({
                        Validated: 'Updated',
                        isLoading: false
                    });
                } else {
                    deferred.resolve({
                        Validated: 'NotUpdated',
                        isLoading: false
                    });
                }
            }).catch(function (res) {
                var dataRes = res && res.data ? res.data : res;
                var xmlDoc = parser.parseFromString(dataRes, "text/xml");
                deferred.reject({
                    Validated: 'Updated',
                    isLoading: false,
                    msg: xmlDoc.getElementsByTagName('faultstring')[0].innerHTML
                });
                settingsUtils.callRemoteAction(remoteActions.WriteToLog, ['ERROR', 'Failed to validate permission set for record types and tab setting visibility.']);
            });

            return deferred.promise;
        }

        function validateTabVisibilityAndRecordType(doc, tabSettingsMap, recordTypeVisibilitiesMap, apexClassesMap) {
            try {
                var tabSettings = doc.childNodes[0].children[0].children[0].children[0].children[0].getElementsByTagName('tabSettings');
                var recordTypeVisibilities = doc.childNodes[0].children[0].children[0].children[0].children[0].getElementsByTagName('recordTypeVisibilities');
                var apexClasses = doc.childNodes[0].children[0].children[0].children[0].children[0].getElementsByTagName('classAccesses');

                if (JSON.stringify(tabSettingsMap) !== JSON.stringify({})) {
                    if (!tabSettings || tabSettings.length == 0) {
                        return false;
                    }

                    for (var i = 0; i < tabSettings.length; i++) {
                        var currTab = tabSettings[i].children[0].innerHTML;

                        if (tabSettingsMap[currTab] == undefined) {
                            continue;
                        }

                        var visibility = tabSettings[i].children[1].innerHTML;

                        if (tabSettingsMap[currTab] != visibility) {
                            return false;
                        }
                    }
                }

                if (JSON.stringify(recordTypeVisibilitiesMap) !== JSON.stringify({})) {
                    if (!recordTypeVisibilities || recordTypeVisibilities.length == 0) {
                        return false;
                    }

                    for (var _i = 0; _i < recordTypeVisibilities.length; _i++) {
                        var currRecordType = recordTypeVisibilities[_i].children[0].innerHTML;

                        if (recordTypeVisibilitiesMap[currRecordType] == undefined) {
                            continue;
                        }

                        var visibility = recordTypeVisibilities[_i].children[1].innerHTML;

                        if (recordTypeVisibilitiesMap[currRecordType] != visibility) {
                            return false;
                        }
                    }
                }
                if (JSON.stringify(apexClassesMap) !== JSON.stringify({})) {
                    if (!apexClasses || apexClasses.length == 0) {
                        return false;
                    }

                    for (var _i2 = 0; _i2 < apexClasses.length; _i2++) {
                        var currApexClass = apexClasses[_i2].children[0].innerHTML;

                        if (apexClassesMap[currApexClass] == undefined) {
                            continue;
                        }

                        var enabled = apexClasses[_i2].children[1].innerHTML;

                        if (apexClassesMap[currApexClass] != enabled) {
                            return false;
                        }
                    }
                }

                return true;
            } catch (err) {
                settingsUtils.callRemoteAction(remoteActions.WriteToLog, ['ERROR', err.message]);
                return true;
            }
        }

        function addPermissionsToSoapString(tabSettings, recordTypeVisibilities, apexClassesAccess) {
            var dataStr = '';
            for (var i = 0; i < tabSettings.length; i++) {
                dataStr += '<tabSettings>' + '<tab>' + tabSettings[i].tab + '</tab>' + '<visibility>' + tabSettings[i].visibility + '</visibility>' + '</tabSettings>';
            }

            for (var j = 0; j < recordTypeVisibilities.length; j++) {
                dataStr += '<recordTypeVisibilities>' + '<recordType>' + recordTypeVisibilities[j].recordType + '</recordType>' + '<visible>' + recordTypeVisibilities[j].visible + '</visible>' + '</recordTypeVisibilities>';
            }

            for (var k = 0; k < apexClassesAccess.length; k++) {
                dataStr += '<classAccesses>' + '<apexClass>' + apexClassesAccess[k].apexClass + '</apexClass>' + '<enabled>' + apexClassesAccess[k].enabled + '</enabled>' + '</classAccesses>';
            }

            return dataStr;
        }

        function createTabAndRecordTypePermission(name, label, tabSettings, recordTypeVisibilities, apexClassesAccess) {
            var deferred = $q.defer();
            var baseUrl = window.location.origin;
            var psFullName = name != 'sfdc_fieldservice' ? name + '_Permissions' : name;
            var psFullLabel = label != 'sfdc_fieldservice' ? label + ' Permissions' : label;

            //in scratch orgs when project is deploye we need to add NS. why? no idea...
            var nsPrefix = isOrgInManagedPackageContext ? '' : 'FSL__';

            var readPermissionSetBody = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:met="http://soap.sforce.com/2006/04/metadata" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n                                <soapenv:Header>\n                                    <met:SessionHeader>   \n                                        <met:sessionId>' + sessionId + '</met:sessionId>\n                                    </met:SessionHeader>\n                                </soapenv:Header>\n                                <soapenv:Body>\n                                    <met:readMetadata>\n                                        <metadataType>PermissionSet</metadataType>\n                                        <fullName>' + nsPrefix + psFullName + '</fullName>\n                                    </met:readMetadata>\n                                </soapenv:Body>\n                            </soapenv:Envelope>';

            var xmlhttp = new XMLHttpRequest();
            xmlhttp.onreadystatechange = function (e) {
                if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {

                    //get only permissions from return xml string
                    var response = xmlhttp.response.substring(xmlhttp.response.indexOf('</fullName>') + 11, xmlhttp.response.indexOf('</records>'));
                    var soapPermissionsString = addPermissionsToSoapString(tabSettings, recordTypeVisibilities, apexClassesAccess);
                    var body = getPermissionSetMetadataBodyString(response, psFullName, psFullLabel, soapPermissionsString);

                    $http.post(baseUrl + '/services/Soap/m/50.0', body, { headers: { 'SOAPAction': '""',
                            'Content-Type': 'text/xml',
                            contentType: "text/xml" }
                    }).then(function (res) {
                        deferred.resolve({
                            Validated: 'Updated',
                            isLoading: false
                        });
                    }, function (res) {
                        deferred.reject({
                            Validated: 'Updated',
                            isLoading: false
                        });
                        settingsUtils.callRemoteAction(remoteActions.WriteToLog, ['ERROR', 'Failed to update permission set for record types and tab setting visibility.']);
                    });
                }
            };
            xmlhttp.open('POST', baseUrl + '/services/Soap/m/50.0');
            xmlhttp.setRequestHeader('Content-Type', 'text/xml');
            xmlhttp.setRequestHeader('Access-Control-Allow-Origin', '*');
            xmlhttp.setRequestHeader('X-Content-Type-Options', 'nosniff');
            xmlhttp.setRequestHeader('SOAPAction', '""');
            xmlhttp.send(readPermissionSetBody);

            return deferred.promise;
        }

        function getPermissionSetMetadataBodyString(response, name, label, soapPermissionsString) {
            var body = '<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:met="http://soap.sforce.com/2006/04/metadata"> \n                            <soapenv:Header> \n                                <met:SessionHeader> \n                                    <met:sessionId>' + sessionId + '</met:sessionId> \n                                </met:SessionHeader> \n                            </soapenv:Header> \n                            <soapenv:Body> \n                                <met:updateMetadata> \n                                    <met:metadata xsi:type="met:PermissionSet"> \n                                        <fullName>' + name + '</fullName> \n                                        <label>' + label + '</label>\n                                        ' + response + '\n                                        ' + soapPermissionsString + '\n                                    </met:metadata>\n                                </met:updateMetadata>\n                            </soapenv:Body>\n                        </soapenv:Envelope>';

            return body;
        }

        function createPermissionSoapRequest(name, shouldCreate) {
            var deferred = $q.defer();

            if (name != 'sfdc_fieldservice') {
                deferred.resolve();
                return deferred.promise;
            }
            if (!shouldCreate) {
                deferred.resolve();
                return deferred.promise;
            }

            var baseUrl = window.location.origin;
            var osaBody = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:met="http://soap.sforce.com/2006/04/metadata" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n                                <soapenv:Header>\n                                    <met:SessionHeader>   \n                                        <met:sessionId>' + sessionId + '</met:sessionId>\n                                    </met:SessionHeader>\n                                </soapenv:Header>\n                                <soapenv:Body>\n                                    <met:updateMetadata> \n                                        <met:metadata xsi:type="met:FieldServiceSettings"> \n                                            <optimizationServiceAccess>true</optimizationServiceAccess> \n                                      </met:metadata> \n                                </met:updateMetadata> \n                                </soapenv:Body>\n                            </soapenv:Envelope>';

            var xmlhttp = new XMLHttpRequest();
            xmlhttp.onreadystatechange = function (e) {
                if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
                    deferred.resolve();
                }
            };
            xmlhttp.open('POST', baseUrl + '/services/Soap/m/50.0');
            xmlhttp.setRequestHeader('Content-Type', 'text/xml');
            xmlhttp.setRequestHeader('Access-Control-Allow-Origin', '*');
            xmlhttp.setRequestHeader('X-Content-Type-Options', 'nosniff');
            xmlhttp.setRequestHeader('SOAPAction', '""');
            xmlhttp.send(osaBody);

            return deferred.promise;
        }

        function isOptimizationServiceAccessEnabled() {
            var deferred = $q.defer();

            var baseUrl = window.location.origin;
            var osaBody = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:met="http://soap.sforce.com/2006/04/metadata" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n                                <soapenv:Header>\n                                    <met:SessionHeader>   \n                                        <met:sessionId>' + sessionId + '</met:sessionId>\n                                    </met:SessionHeader>\n                                </soapenv:Header>\n                                <soapenv:Body>\n                                    <met:readMetadata>\n                                        <metadataType>FieldServiceSettings</metadataType>\n                                        <fullNames>optimizationServiceAccess</fullNames> \n                                    </met:readMetadata>\n                                </soapenv:Body>\n                            </soapenv:Envelope>';

            var xmlhttp = new XMLHttpRequest();
            xmlhttp.onreadystatechange = function (e) {
                if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
                    var parser = new DOMParser();
                    var xmlDoc = parser.parseFromString(xmlhttp.response, "text/xml");
                    var optServiceAccess = xmlDoc.childNodes[0].children[0].children[0].children[0].children[0].getElementsByTagName('optimizationServiceAccess');

                    deferred.resolve(optServiceAccess.length > 0);
                } else if (xmlhttp.readyState === 4 && xmlhttp.status !== 200) {
                    console.log("Error", xmlhttp.statusText);
                    deferred.resolve(false);
                }
            };
            xmlhttp.open('POST', baseUrl + '/services/Soap/m/50.0');
            xmlhttp.setRequestHeader('Content-Type', 'text/xml');
            xmlhttp.setRequestHeader('Access-Control-Allow-Origin', '*');
            xmlhttp.setRequestHeader('X-Content-Type-Options', 'nosniff');
            xmlhttp.setRequestHeader('SOAPAction', '""');
            xmlhttp.send(osaBody);

            return deferred.promise;
        }

        function assignAdminToUser() {
            var deferred = $q.defer();

            settingsUtils.callRemoteAction(remoteActions.AssignAdminToUser).then(function (res) {
                deferred.resolve();
            }).catch(function (res) {
                deferred.reject();
            });

            return deferred.promise;
        }

        return {
            createPermission: createPermission,
            validateTabAndRecordTypePermission: validateTabAndRecordTypePermission,
            validateTabVisibilityAndRecordType: validateTabVisibilityAndRecordType,
            createTabAndRecordTypePermission: createTabAndRecordTypePermission,
            assignAdminToUser: assignAdminToUser,
            isOptimizationServiceAccessEnabled: isOptimizationServiceAccessEnabled
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('gettingStartedPermissionSets', gettingStartedPermissionSets);

    gettingStartedPermissionSets.$inject = [];

    function gettingStartedPermissionSets() {

        controllerFunction.$inject = ['$scope', 'dataService', 'primitiveType', '$rootScope', 'settingsUtils', '$q', 'permissionSetService'];

        function controllerFunction($scope, dataService, primitiveType, $rootScope, settingsUtils, $q, permissionSetService) {
            $scope.permissionsMap = {};

            // isSchedulingBundlingEnabledPromise is set in vf066_settings.page
            // wait for the global isSchedulingBundlingEnabledPromise then if the bundle is on show the bundle permission

            isSchedulingBundlingEnabledAndActivePromise.then(function () {

                if (isSchedulingBundlingEnabledAndActivePromiseRes) {

                    $scope.permissionsMap["FSL_Bundle"] = { Name: 'FSL_Bundle',
                        Label: 'Field Service Bundle for Dispatcher',
                        License: 'FieldServiceStandard',
                        Img: 'bundlePerms',
                        Msg: 'Permissions for dispatchers to schedule and manage bundle service appointments.',
                        Validated: null,
                        ErrorMsg: '' };

                    // build $scope.permissions again
                    $scope.permissions = Object.keys($scope.permissionsMap).map(function (k) {
                        return $scope.permissionsMap[k];
                    });
                }
            });

            $scope.dataService = dataService;
            dataService.getSettingsPromise().then(function (res) {
                $scope.PermissionsMissing = false;
                $scope.PreventPSAutoUpdate = $scope.dataService.getDraftSettings().PerventPermissionsUpdate;
            }).catch(function (res) {
                $scope.PermissionsMissing = true;
                $scope.PreventPSAutoUpdate = false;
            });

            $scope.topError = undefined;
            $scope.permissionsMap = { "FSL_Dispatcher": { Name: 'FSL_Dispatcher',
                    Label: 'Field Service Dispatcher',
                    License: 'FieldServiceDispatcher',
                    Img: 'dispatcher',
                    Msg: 'Permissions to view and use the dispatcher console, view global actions and their related objects, and schedule, optimize, and dispatch service appointments.',
                    Validated: null,
                    ErrorMsg: '' },
                "FSL_Resource": { Name: 'FSL_Resource',
                    Label: 'Field Service Resource',
                    License: 'FieldServiceScheduling',
                    Img: 'resource',
                    Msg: 'Permissions to view and manage service appointments and their related parent objects.',
                    Validated: null,
                    ErrorMsg: '' },
                "FSL_Agent": { Name: 'FSL_Agent',
                    Label: 'Field Service Agent',
                    License: 'FieldServiceStandard',
                    Img: 'agent',
                    Msg: 'Permissions to view all global actions and their related objects to create, book, and schedule service appointments.',
                    Validated: null,
                    ErrorMsg: '' },
                "FSL_Community_Self_Service": { Name: 'FSL_Community_Self_Service',
                    Label: 'Field Service Self Service',
                    License: 'FieldServiceStandard',
                    Img: 'community',
                    Msg: 'Permissions for community users to view all global actions and their related objects to create, book, and schedule their own appointments.',
                    Validated: null,
                    ErrorMsg: '' },
                "FSL_Community_Dispatcher": { Name: 'FSL_Community_Dispatcher',
                    Label: 'Field Service Community Dispatcher',
                    License: 'FieldServiceDispatcher',
                    Img: 'dispatchercommunity',
                    Msg: 'Permissions for community users to view and use the dispatcher console, view global actions and their related objects, and schedule, optimize, and dispatch service appointments.',
                    Validated: null,
                    ErrorMsg: '' },
                "FSL_Admin": { Name: 'FSL_Admin',
                    Label: 'Field Service Admin',
                    License: 'FieldServiceStandard',
                    Img: 'admin',
                    Msg: 'Permissions to access and manage all Field Service objects including the \'Field Service Admin\' app, Field Service Visualforce pages, and logic services.',
                    Validated: null,
                    ErrorMsg: '' }

            };

            $scope.permissions = Object.keys($scope.permissionsMap).map(function (k) {
                return $scope.permissionsMap[k];
            });

            permissionSetService.isOptimizationServiceAccessEnabled().then(function (enabled) {
                if (enabled) {

                    $scope.permissionsMap["sfdc_fieldservice"] = {
                        Name: 'sfdc_fieldservice',
                        Label: 'Field Service Integration',
                        License: 'FieldServiceStandard',
                        Img: 'dispatchercommunity',
                        Msg: 'Permissions to access data needed for optimization, automatic scheduling, and service appointment bundling.',
                        Validated: null,
                        ErrorMsg: ''
                    };

                    $scope.permissions.push($scope.permissionsMap['sfdc_fieldservice']);
                }
            });
        }

        var template = '\n            <div class="permissions-container">\n              <div class="settingsError" ng-show="PermissionsMissing">\n              Field Service Admin permissions required. Please assign the "Field Service Admin" permission set to your user or contact your system administrator.<br>\n                You can create/update the permission set with the button below.<br>\n              </div>\n              <div class="settingsError" ng-show=\'topError\'>{{topError}}</div>\n              <div ng-show="PreventPSAutoUpdate" class="blue-banner-small">Permission sets auto update feature is turned off. Make sure to update your permission sets after each version upgrade.</div>\n              <permission-set ng-repeat="permission in permissions" settings="permission"></permission-set>\n            </div>\n        ';

        return {
            restrict: 'E',
            scope: {
                verifyFunctions: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('globalActionsBooking', globalActionsBooking);

    globalActionsBooking.$inject = [];

    function globalActionsBooking() {

        controllerFunction.$inject = ['$scope', 'dataService', 'primitiveType', 'settingsUtils'];

        function controllerFunction($scope, dataService, primitiveType, settingsUtils) {

            $scope.verifyFunctions.push(function () {
                return console.log('verify - globalActionsBooking');
            });

            $scope.settings = dataService.getDraftSettings();
            $scope.primitiveType = primitiveType;

            $scope.operatingHoursOptions = {
                inputText: null,
                loading: false,
                cahchedOperatingHours: {},
                showOhPicker: false,
                ohResults: [],
                ohIdToName: {}
            };

            dataService.getSettingsPromise().then(function () {

                $scope.schedulingPolicies = dataService.policies;
                $scope.operatingHours = dataService.operatingHours;

                if ($scope.settings.manyOperatingHours) {

                    // selected settings
                    $scope.operatingHoursOptions.inputText = $scope.settings.OperatingHours[0].Name;
                    $scope.operatingHoursOptions.ohIdToName[$scope.settings.OperatingHours[0].Id] = $scope.settings.OperatingHours[0];
                }
            });

            $scope.searchOperatingHours = function (text) {

                if (!$scope.operatingHoursOptions.inputText) {
                    return;
                }

                $scope.operatingHoursOptions.showOhPicker = true;

                // cached results
                if ($scope.operatingHoursOptions.cahchedOperatingHours[text]) {
                    $scope.operatingHoursOptions.ohResults = $scope.operatingHoursOptions.cahchedOperatingHours[text];
                    return;
                }

                $scope.operatingHoursOptions.loading = true;

                settingsUtils.callRemoteAction(remoteActions.searchOperatingHours, [text], false).then(function (results) {

                    $scope.operatingHoursOptions.cahchedOperatingHours[text] = results;

                    if (text === $scope.operatingHoursOptions.inputText) {
                        $scope.operatingHoursOptions.ohResults = results;
                    }

                    results.forEach(function (oh) {
                        return $scope.operatingHoursOptions.ohIdToName[oh.Id] = oh;
                    });

                    $scope.operatingHoursOptions.loading = false;
                });
            };

            $scope.selectHoursFromPicker = function (oh, e) {

                e.stopPropagation();

                $scope.settings.AppointmentBookingSettings.DefaultOperatingHours__c = oh.Id;
                $scope.operatingHoursOptions.inputText = oh.Name;
                $scope.operatingHoursOptions.showOhPicker = false;
            };

            $scope.hideOperatingHoursSelector = function () {
                $scope.operatingHoursOptions.showOhPicker = false;
                $scope.operatingHoursOptions.inputText = $scope.operatingHoursOptions.ohIdToName[$scope.settings.AppointmentBookingSettings.DefaultOperatingHours__c] && $scope.operatingHoursOptions.ohIdToName[$scope.settings.AppointmentBookingSettings.DefaultOperatingHours__c].Name;
            };
        }

        var template = '\n        <div ng-click="hideOperatingHoursSelector()">\n        \n               <p>These settings affect the Book Appointment and Candidates global actions</p>\n                \n                <custom-settings-wrapper primitive-type="primitiveType.picklist" options="schedulingPolicies" label="\'Default scheduling policy\'" tooltip-text="The policy used when no mapping is defined on the Derivations tab." value-field-name="\'SchedulingPolicyId__c\'" setting="settings.AppointmentBookingSettings"></custom-settings-wrapper>\n                \n                \n                <! -- if we have less than 2k operating hours -->\n                <custom-settings-wrapper ng-if="!settings.manyOperatingHours" primitive-type="primitiveType.picklist" options="operatingHours" label="\'Default operating hours\'" tooltip-text="The appointment slots displayed unless the work order\'s entitlement doesn\'t reference other hours." value-field-name="\'DefaultOperatingHours__c\'" setting="settings.AppointmentBookingSettings"></custom-settings-wrapper>\n                \n                \n                <! -- many operating hours, show auto complete -->\n                <div ng-if="settings.manyOperatingHours">\n                \n                    <div class="setting-row-container">\n                    \n                        <label class="select-label">\n                            Default operating hours\n                            <tooltip>The appointment slots displayed unless the work order\'s entitlement doesn\'t reference other hours.</tooltip>\n                        </label>\n                        \n                        <div class="select-container">\n                            <input type="text" class="input-settings" ng-model="operatingHoursOptions.inputText" ng-model-options="{debounce: 333}" ng-change="searchOperatingHours(operatingHoursOptions.inputText)" ng-click="$event.stopPropagation()"/>\n                            \n                            <img class="loading-oh-row" ng-show="operatingHoursOptions.loading" src="' + window.settings.icons.spinner + '" />\n                            \n                            <div id="noOhFound" ng-show="operatingHoursOptions.ohResults.length === 0 && operatingHoursOptions.showOhPicker && !operatingHoursOptions.loading && operatingHoursOptions.inputText">No operating hours found</div>\n                            \n                            <div id="AutoCompleteOperatingHours" ng-show="operatingHoursOptions.ohResults.length > 0 && operatingHoursOptions.showOhPicker">\n                                <div ng-repeat="oh in operatingHoursOptions.ohResults" ng-click="selectHoursFromPicker(oh, $event)">\n                                    {{oh.Name}}\n                                </div>\n                            </div>\n                        </div>\n                    </div>\n                    \n               </div>\n               \n                \n                <custom-settings-wrapper primitive-type="primitiveType.number" min="0" max="100" label="\'Ideal grading threshold\'" tooltip-text="A slot grade equal to or higher than the specified value is shown with the Ideal ticker on the Appointment Booking chatter action." value-field-name="\'Ideal_Threshold__c\'" setting="settings.AppointmentBookingSettings"></custom-settings-wrapper>\n                <custom-settings-wrapper primitive-type="primitiveType.number" min="0" max="100" label="\'Recommended grading threshold\'" tooltip-text="A slot grade equal to or higher than the specified value and lower than the ideal threshold is shown with the recommended ticker on the Appointment Booking chatter action." value-field-name="\'Recommended_Threshold__c\'" setting="settings.AppointmentBookingSettings"></custom-settings-wrapper>\n                <custom-settings-wrapper primitive-type="primitiveType.number" min="0" max="100" label="\'Minimum Grade\'" tooltip-text="Time slots whose grade is below the minimum grade won\u2019t appear in the list of potential time slots." value-field-name="\'Minimum_Grade__c\'" setting="settings.AppointmentBookingSettings"></custom-settings-wrapper>\n                <custom-settings-wrapper primitive-type="primitiveType.number" min="1" max="500" label="\'Number of hours for initial appointment search\'" tooltip-text="If the difference between the due date and the earliest start permitted is greater than this value, the appointment is displayed first with this setting." value-field-name="\'LazyLoadBookingInHours__c\'" setting="settings.AppointmentBookingSettings"></custom-settings-wrapper>\n                <custom-settings-wrapper primitive-type="primitiveType.boolean" label="\'Show grades explanation\'" tooltip-text="Shows how each appointment slot ranks against key performance indicators" value-field-name="\'Show_Grade_Explanation__c\'" setting="settings.AppointmentBookingSettings"></custom-settings-wrapper>\n                <custom-settings-wrapper primitive-type="primitiveType.text" label="\'Custom CSS (cascading style sheet)\'" tooltip-text="Customize global actions appearance (static resource name)" value-field-name="\'CustomCSS__c\'" setting="settings.AppointmentBookingSettings"></custom-settings-wrapper>\n                <custom-settings-wrapper primitive-type="primitiveType.boolean" label="\'Disable service territory picker in appointment booking\'" tooltip-text="Hide the service territory picker on the Appointment Booking Chatter action" value-field-name="\'AutoTerritoryPicker__c\'" setting="settings.AppointmentBookingSettings"></custom-settings-wrapper>            \n                <custom-settings-wrapper primitive-type="primitiveType.boolean" label="\'Pin three highest graded time slots to the top\'" tooltip-text="Highlight and pin the three highest graded time slots to the top of the list of potential time slots." value-field-name="\'ShowGoldenSlots__c\'" setting="settings.AppointmentBookingSettings"></custom-settings-wrapper>\n                <custom-settings-wrapper primitive-type="primitiveType.boolean" label="\'Open extended view by default\'" tooltip-text="Display appointments in the extended view, which shows the Earliest Start Permitted and Due Date fields." value-field-name="\'ShowMoreOptions__c\'" setting="settings.AppointmentBookingSettings"></custom-settings-wrapper>\n                \n            </div>\n        ';

        return {
            restrict: 'E',
            scope: {
                verifyFunctions: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('globalActionsDerivations', globalActionsDerivations);

    globalActionsDerivations.$inject = [];

    function globalActionsDerivations() {

        controllerFunction.$inject = ['$scope', 'optimizationService', 'primitiveType', 'dataService', 'globalActionsService', '$rootScope'];

        function controllerFunction($scope, optimizationService, primitiveType, dataService, globalActionsService, $rootScope) {

            $scope.verifyFunctions.push(function () {
                return console.log('verify - globalActionsDerivations');
            });

            $scope.objectMappingFields = fieldNames.ObjectMapping__c;
            $scope.primitiveType = primitiveType;
            $scope.schedulingPolicyName = fieldNames.SchedulingPolicyName;

            // all objects
            $scope.objectMappings = globalActionsService.objectMappings;
            $scope.fieldNamesOfObjects = {};
            $scope.allObjects = [{ label: ' -- Select Object -- ' }];
            $scope.selectedNewObject = $scope.allObjects[0];
            var filteredPicklist = {};

            dataService.getSettingsPromise().then(function () {
                dataService.getDraftSettings().ObjectMapping.forEach(function (mapping) {
                    var newObjectMap = new ObjectMapping(mapping.Name, mapping[fieldNames.ObjectMapping__c.label__c], mapping);
                    newObjectMap.isOpen = false;
                    $scope.objectMappings[mapping.Name] = newObjectMap;

                    if (!$scope.fieldNamesOfObjects[mapping.Name]) {
                        optimizationService.serviceReferenceProperties(mapping.Name).then(function (objectProperties) {
                            $scope.fieldNamesOfObjects[mapping.Name] = transformFieldsToPicklist(objectProperties.fields);
                        });
                    }
                });
            });

            // after restore
            $rootScope.$on('settingsUpdated', function () {

                Object.keys($scope.objectMappings).forEach(function (key) {
                    return delete $scope.objectMappings[key];
                });

                dataService.getDraftSettings().ObjectMapping.forEach(function (mapping) {
                    var newObjectMap = new ObjectMapping(mapping.Name, mapping[fieldNames.ObjectMapping__c.label__c], mapping);
                    newObjectMap.isOpen = false;
                    $scope.objectMappings[mapping.Name] = newObjectMap;

                    if (!$scope.fieldNamesOfObjects[mapping.Name]) {
                        optimizationService.serviceReferenceProperties(mapping.Name).then(function (objectProperties) {
                            $scope.fieldNamesOfObjects[mapping.Name] = transformFieldsToPicklist(objectProperties.fields);
                        });
                    }
                });
            });

            // get all objects
            optimizationService.getAllObjects().then(function (objects) {
                objects.forEach(function (obj) {
                    if (obj.triggerable == "true") {
                        $scope.allObjects.push(obj);
                    }
                });
            });

            // get selectable objects
            $scope.getSelectableObjects = function () {
                return $scope.allObjects.filter(function (obj) {
                    return obj.label === ' -- Select Object -- ' || !$scope.objectMappings[obj.name];
                });
            };

            // get fields of WorkOrder
            optimizationService.serviceReferenceProperties('WorkOrder').then(function (objectProperties) {
                $scope.fieldNamesOfObjects['WorkOrder'] = transformFieldsToPicklist(objectProperties.fields);
            });

            $scope.addObject = function (sobj) {

                if (!sobj.name) {
                    return;
                }

                $scope.selectedNewObject = $scope.allObjects[0];
                var newObjectMap = new ObjectMapping(sobj.name, sobj.label);
                newObjectMap.isOpen = true;
                newObjectMap[fieldNames.ObjectMapping__c.Active__c] = true;
                $scope.objectMappings[sobj.name] = newObjectMap;
                optimizationService.serviceReferenceProperties(sobj.name).then(function (objectProperties) {
                    $scope.fieldNamesOfObjects[sobj.name] = transformFieldsToPicklist(objectProperties.fields);
                });
            };

            function transformFieldsToPicklist(fields) {

                var fieldPicklist = [{ value: null, label: '--- SKIP ---' }];

                fields.forEach(function (field) {
                    fieldPicklist.push({
                        value: field.name,
                        label: field.name,
                        type: field.type,
                        referenceTo: field.referenceTo
                    });
                });

                return fieldPicklist;
            }

            $scope.getFilteredPicklist = function (name, type, refTo) {

                // check if cached
                if (refTo && filteredPicklist[name] && filteredPicklist[name][type] && filteredPicklist[name][type][refTo]) {
                    return filteredPicklist[name][type][refTo];
                }

                if (filteredPicklist[name] && filteredPicklist[name][type] && refTo === undefined) {
                    return filteredPicklist[name][type];
                }

                // calculate
                filteredPicklist[name] = filteredPicklist[name] || {};

                if (refTo) {

                    filteredPicklist[name][type] = filteredPicklist[name][type] || {};
                    filteredPicklist[name][type][refTo] = $scope.fieldNamesOfObjects[name].filter(function (pick) {
                        return pick.type === undefined || pick.type == type && pick.referenceTo == refTo;
                    }).sort(function (a, b) {
                        return a.label > b.label ? 1 : -1;
                    });
                    return filteredPicklist[name][type][refTo];
                }

                filteredPicklist[name][type] = $scope.fieldNamesOfObjects[name].filter(function (pick) {
                    return pick.type == type || type == 'string' && pick.type == 'textarea' || pick.type === undefined;
                }).sort(function (a, b) {
                    return a.label > b.label ? 1 : -1;
                });

                return filteredPicklist[name][type];
            };

            $scope.deleteObjectMapping = function (object) {
                delete $scope.objectMappings[object.Name];

                if (object.Id) {
                    globalActionsService.deletedMappings().push(object);
                }
            };

            $scope.isParent = function (objMapping) {
                return objMapping.Name == 'WorkOrder' || objMapping.Name == 'WorkOrderLineItem';
            };

            $scope.isService = function (objMapping) {
                return objMapping.Name == 'ServiceAppointment';
            };
        }

        var template = '\n                        <p>Set default values from the object to the global action interface. The user can override the values when needed.\n                        </p>\n                        <div class="newObjectSelect-container">\n                            <div id="new-object-picklist-container" class="slds-select_container">\n                                <select class="slds-select" ng-model="selectedNewObject" ng-options="object.label for object in getSelectableObjects() | orderBy:\'label\'">\n                                </select>\n                            </div>\n\n                            <div ng-click="addObject(selectedNewObject)" class="save-button add-mapping-button blueButton">Add Object</div>\n                        </div>\n \n\n                        <content-collapse-wrapper header="object[objectMappingFields.label__c]" open="object.isOpen" ng-repeat="object in objectMappings">\n                            <content>\n                                \n                                <custom-settings-wrapper ng-if="!isService(object)" primitive-type="primitiveType.picklist" options="getFilteredPicklist(object.Name, \'string\')" label="\'Street\'" value-field-name="\'Street__c\'" setting="object"></custom-settings-wrapper>\n                                <custom-settings-wrapper ng-if="!isService(object)" primitive-type="primitiveType.picklist" options="getFilteredPicklist(object.Name, \'string\')" label="\'City\'" value-field-name="\'City__c\'" setting="object"></custom-settings-wrapper>\n                                <custom-settings-wrapper ng-if="!isService(object)" primitive-type="primitiveType.picklist" options="getFilteredPicklist(object.Name, \'string\')" label="\'State\'" value-field-name="\'State__c\'" setting="object"></custom-settings-wrapper>\n                                <custom-settings-wrapper ng-if="!isService(object)" primitive-type="primitiveType.picklist" options="getFilteredPicklist(object.Name, \'string\')" label="\'Country\'" value-field-name="\'Country__c\'" setting="object"></custom-settings-wrapper>\n                                <custom-settings-wrapper ng-if="!isService(object)" primitive-type="primitiveType.picklist" options="getFilteredPicklist(object.Name, \'string\')" label="\'Zip Code\'" value-field-name="\'Zipcode__c\'" setting="object"></custom-settings-wrapper>\n                                <custom-settings-wrapper ng-if="!isService(object)" primitive-type="primitiveType.picklist" options="getFilteredPicklist(object.Name, \'double\')" label="\'Latitude\'" value-field-name="\'Latitude__c\'" setting="object"></custom-settings-wrapper>\n                                <custom-settings-wrapper ng-if="!isService(object)" primitive-type="primitiveType.picklist" options="getFilteredPicklist(object.Name, \'double\')" label="\'Longitude\'" value-field-name="\'Longitude__c\'" setting="object"></custom-settings-wrapper>\n                                <custom-settings-wrapper ng-if="!isService(object)" primitive-type="primitiveType.picklist" options="getFilteredPicklist(object.Name, \'datetime\')" label="\'Earliest Start Permitted\'" value-field-name="\'Early_Start__c\'" setting="object"></custom-settings-wrapper>\n                                <custom-settings-wrapper ng-if="!isService(object)" primitive-type="primitiveType.picklist" options="getFilteredPicklist(object.Name, \'datetime\')" label="\'Due Date\'" value-field-name="\'Due_Date__c\'" setting="object"></custom-settings-wrapper>\n                                <custom-settings-wrapper primitive-type="primitiveType.picklist" options="getFilteredPicklist(object.Name, \'reference\', schedulingPolicyName)" label="\'Scheduling Policy\'" value-field-name="\'Scheduling_Policy__c\'" setting="object"></custom-settings-wrapper>\n                                <custom-settings-wrapper ng-if="!isService(object)" primitive-type="primitiveType.picklist" options="getFilteredPicklist(object.Name, \'reference\', \'ServiceTerritory\')" label="\'Service Territory\'" value-field-name="\'Territory__c\'" setting="object"></custom-settings-wrapper>\n                                <custom-settings-wrapper ng-if="!isService(object)" primitive-type="primitiveType.picklist" options="getFilteredPicklist(object.Name, \'reference\', \'WorkType\')" label="\'Default Work Type\'" value-field-name="\'Default_Type__c\'" setting="object"></custom-settings-wrapper>\n                                <custom-settings-wrapper ng-if="!isParent(object) && !isService(object)" primitive-type="primitiveType.picklist" options="getFilteredPicklist(\'WorkOrder\', \'reference\', object.Name)" label="\'Lookup From Work Order\'" value-field-name="\'ObjectID__c\'" setting="object"></custom-settings-wrapper>\n                                \n                                <div class="delete-button-settings" ng-click="deleteObjectMapping(object)">Delete Mapping</div>\n                                \n                            </content>\n                        </content-collapse-wrapper>';

        return {
            restrict: 'E',
            scope: {
                verifyFunctions: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('globalActionsEmergency', globalActionsEmergency);

    globalActionsEmergency.$inject = [];

    function globalActionsEmergency() {

        controllerFunction.$inject = ['$scope', 'dataService', 'primitiveType'];

        function controllerFunction($scope, dataService, primitiveType) {

            $scope.verifyFunctions.push(function () {
                return console.log('verify - globalActionsEmergency');
            });

            $scope.settings = dataService.getDraftSettings();
            $scope.primitiveType = primitiveType;

            dataService.getSettingsPromise().then(function () {
                $scope.schedulingPolicies = dataService.policies;
                $scope.operatingHours = dataService.operatingHours;
            });

            $scope.chatterPostDestionation = [{ label: 'Service Appointment Feed', value: 'sa' }, { label: 'Parent Record Feed', value: 'wo' }];
        }

        var template = '\n            <custom-settings-wrapper primitive-type="primitiveType.picklist" options="schedulingPolicies" label="\'Emergency scheduling policy\'" tooltip-text="The default policy selected in the wizard" value-field-name="\'SchedulingPolicyId__c\'" setting="settings.EmergencySettings"></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.number" min="1" max="10000" label="\'Last known location validity\'" tooltip-text="The number of minutes a technician\'s Last Known Location will be considered" value-field-name="\'Breadcrumbs_Validity__c\'" setting="settings.EmergencySettings"></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.number" min="1" max="100" label="\'Ideal availability grade\'" tooltip-text="The threshold, in minutes, for an ideal estimated time of arrival" value-field-name="\'Ideal_Availability_Grade__c\'" setting="settings.EmergencySettings"></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.number" min="1" max="100" label="\'Good availability grade\'" tooltip-text="The threshold, in minutes, for an acceptable estimated time of arrival" value-field-name="\'Good_Availability_Grade__c\'" setting="settings.EmergencySettings"></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.number" min="1" max="10000" label="\'Emergency search timeframe\'" tooltip-text="Number of minutes to add to the current time when searching availability" value-field-name="\'Emergency_Due_Date_Offset__c\'" setting="settings.EmergencySettings"></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.boolean" label="\'Allow Chatter post\'" tooltip-text="In an emergency service appointment dispatch, give dispatchers the option to make a custom Chatter post on the assigned resource\u2019s Chatter feed or to not post at all. If this option isn\u2019t selected, no Chatter post is made." value-field-name="\'Chatter_Availability__c\'" setting="settings.EmergencySettings"></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.picklist" options="chatterPostDestionation" label="\'Emergency Chatter Post Destination\'" tooltip-text=\n            "Select where to post Chatter notifications when an emergency appointment is assigned. The post mentions the assigned resources. This setting applies only if Allow Chatter post is selected." value-field-name="\'ChatterDestination__c\'" setting="settings.EmergencySettings"></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.boolean" label="\'Pin After Dispatch\'" tooltip-text="If dispatched ASAP, pin the service" value-field-name="\'PinService__c\'" setting="settings.EmergencySettings"></custom-settings-wrapper>\n        ';

        return {
            restrict: 'E',
            scope: {
                verifyFunctions: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('optimizationActivation', optimizationActivation);

    optimizationActivation.$inject = [];

    function optimizationActivation() {

        controllerFunction.$inject = ['$scope', '$http', '$timeout', 'settingsUtils', 'dataService', 'schedulingRecipesService'];

        function controllerFunction($scope, $http, $timeout, settingsUtils, dataService, schedulingRecipesService) {

            $scope.verifyFunctions.push(function () {
                return console.log('verify - optimizationActivation');
            });

            $scope.authorizedNow = location.search.indexOf('result=1') >= 0;
            $scope.startAuthorization = startAuthorization; // ActionFunction
            $scope.auth = {};
            $scope.auth.user = authorizationInfo[fieldNames.AuthorizationInfo.Username__c];
            $scope.auth.moment = new Date(authorizationInfo[fieldNames.AuthorizationInfo.Auth_Date__c]);
            $scope.authorized = $scope.auth.user !== undefined && $scope.auth.user !== null;
            $scope.sessionId = sessionId;
            $scope.orgProps;
            $scope.profileStatus;
            $scope.enableOptimizationBtn;
            $scope.infoMsg;
            $scope.creatingProfile = false;
            $scope.activationMsg = 'Activate Optimization';
            $scope.nameSpace = orgNameSpace;
            $scope.EdgeOptimizationEnabled = false;
            $scope.EdgeRemoteIsInactive = false;
            $scope.isLoading = true;
            $scope.isOptimizationUser = false;
            $scope.hasInDayPolicies = false;
            $scope.openLink = settingsUtils.openLink;
            $scope.insightsEnabled = false;
            $scope.hasInsightsClassPermission = false;
            $scope.isOptimizationProfileExist = isOptimizationProfileExist === 'true' ? true : false;
            $scope.useEdgeFMA = useEdgeFMA;
            $scope.isOptimizationEnvironmentPickerEnabled = Boolean(Number(isOptimizationEnvironmentPickerEnabled));

            if (profile === currentProfileName) {
                $scope.isOptimizationUser = true;
                $scope.profileStatus = "activate";
                $scope.enableOptimizationBtn = true;
                $scope.activationMsg = $scope.authorized ? 'Reactivate Optimization' : $scope.activationMsg;
                $scope.infoMsg = !$scope.authorized ? 'Field Service Optimization Services' : '';
            } else if (isOptimizationProfileExist === "true") {
                $scope.profileStatus = "switchUser";
                $scope.enableOptimizationBtn = false;
                $scope.activationMsg = $scope.authorized ? 'Optimization Is Active' : $scope.activationMsg;
                $scope.infoMsg = 'Your user profile isn\'t authorized. To enable optimization, log in as the ' + currentProfileName + ' user.';
            } else {
                $scope.profileStatus = "createProfile";
                $scope.enableOptimizationBtn = true;
                $scope.activationMsg = 'Create Optimization Profile';
                $scope.infoMsg = 'User profile not authorized'; //, To enable optimization create optimization profile by pressing the "Create optimization profile" button';
            }

            dataService.getSettingsPromise().then(function () {
                $scope.settings = dataService.getDraftSettings();
                $scope.policies = dataService.policies;

                for (var i = 0; i < $scope.policies.length; i++) {
                    if (dataService.isDailyOptimizationPolicy($scope.policies[i].value)) {
                        $scope.hasInDayPolicies = true;
                        break;
                    }
                }

                if ($scope.isOptimizationUser === false) {
                    $scope.getEdgeRemoteSiteStatus();
                }

                //no parameter from FMA
                if ($scope.useEdgeFMA === null) {
                    $scope.showEnhancedToggle = $scope.settings.GeneralConfig['Enhanced Optimization Only'][fieldNames.General_Config__c.Value__c] === '0';
                } else {

                    //FMA parameter found, show toggle if enhanced only is false AND FMA edge is false.
                    $scope.showEnhancedToggle = $scope.settings.GeneralConfig['Enhanced Optimization Only'][fieldNames.General_Config__c.Value__c] === '0' && !$scope.useEdgeFMA;
                }

                $scope.insightsEnabled = $scope.settings.LogicSettings[fieldNames.Logic_Settings__c.Enable_Optimization_Insights__c] === true;

                $scope.chosenOptimizationEnvironment = $scope.settings.AuthorizationInfo[0][fieldNames.AuthorizationInfo.Custom_URL__c];
            });

            $scope.activateOptimization = function () {
                if ($scope.profileStatus == "createProfile") {
                    $scope.creatingProfile = true;

                    settingsUtils.callRemoteAction(remoteActions.getOrgProperties).then(function (orgProp) {
                        $scope.orgProps = orgProp;

                        var baseUrl = window.location.origin;
                        var dataStr = '<?xml version="1.0" encoding="UTF-8"?><env:Envelope xmlns:env="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><env:Header><SessionHeader xmlns="http://soap.sforce.com/2006/04/metadata"><sessionId>' + $scope.sessionId + '</sessionId></SessionHeader></env:Header><env:Body><readMetadata xmlns="http://soap.sforce.com/2006/04/metadata"><type>Profile</type><fullNames>Admin</fullNames></readMetadata></env:Body></env:Envelope>';

                        $http.post(baseUrl + '/services/Soap/m/38.0', dataStr, {
                            responseType: 'document',
                            headers: { 'SOAPAction': '""', 'Content-Type': 'text/xml', contentType: "text/xml" }
                        }).then(function (res) {
                            $scope.orgProps.fields = res.data.getElementsByTagName('fieldPermissions');
                            $scope.createProfile(baseUrl);
                        }).catch(function () {
                            $scope.creatingProfile = false;
                        });
                    });
                } else if ($scope.profileStatus = "activate") {
                    $scope.startAuthorization();
                }
            };

            $scope.updateProfile = function (baseUrl) {
                if (isOptimizationProfileExist) {

                    settingsUtils.callRemoteAction(remoteActions.getOrgProperties).then(function (orgProp) {
                        $scope.orgProps = orgProp;

                        var baseUrl = window.location.origin;
                        var settingsTabName = 'Master_Settings';
                        var dataStr = '<?xml version="1.0" encoding="UTF-8"?><env:Envelope xmlns:env="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><env:Header><SessionHeader xmlns="http://soap.sforce.com/2006/04/metadata"><sessionId>' + $scope.sessionId + '</sessionId></SessionHeader></env:Header><env:Body><updateMetadata xmlns="http://soap.sforce.com/2006/04/metadata"><metadata xsi:type="Profile"><fullName>' + currentProfileName + '</fullName>';
                        dataStr += $scope.addPagesPermission($scope.orgProps.pages);
                        dataStr += $scope.addClassesPermission($scope.orgProps.classes);
                        dataStr += $scope.addObjectsPermission($scope.orgProps.objects);
                        dataStr += $scope.addUserPermissions($scope.orgProps.permissions);
                        dataStr += $scope.addRecordTypes($scope.orgProps.recordtypes);
                        dataStr += $scope.addApps($scope.orgProps.apps);
                        dataStr += $scope.addFieldsPermission($scope.orgProps.fields);
                        settingsTabName = $scope.nameSpace != '' ? $scope.nameSpace + settingsTabName : settingsTabName;
                        dataStr += '<tabVisibilities><tab>' + settingsTabName + '</tab><visibility>DefaultOn</visibility></tabVisibilities>';
                        dataStr += '</metadata></updateMetadata></env:Body></env:Envelope>';

                        $http.post(baseUrl + '/services/Soap/m/38.0', dataStr, {
                            headers: { 'SOAPAction': '""', 'Content-Type': 'text/xml', contentType: "text/xml" }
                        }).then(function (res) {

                            //console.log(JSON.stringify(res))
                        }).catch(function (err) {

                            //console.log(JSON.stringify(err))
                        });
                    });
                }
            };

            $scope.createProfile = function (baseUrl) {
                var settingsTabName = 'Master_Settings';
                var dataStr = '<?xml version="1.0" encoding="UTF-8"?><env:Envelope xmlns:env="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><env:Header><SessionHeader xmlns="http://soap.sforce.com/2006/04/metadata"><sessionId>' + $scope.sessionId + '</sessionId></SessionHeader></env:Header><env:Body><createMetadata xmlns="http://soap.sforce.com/2006/04/metadata"><metadata xsi:type="Profile"><fullName>Field Service Optimization</fullName>';
                dataStr += $scope.addPagesPermission($scope.orgProps.pages);
                dataStr += $scope.addClassesPermission($scope.orgProps.classes);
                dataStr += $scope.addObjectsPermission($scope.orgProps.objects);
                dataStr += $scope.addUserPermissions($scope.orgProps.permissions);
                dataStr += $scope.addRecordTypes($scope.orgProps.recordtypes);
                dataStr += $scope.addApps($scope.orgProps.apps);
                dataStr += $scope.addFieldsPermission($scope.orgProps.fields);
                settingsTabName = $scope.nameSpace != '' ? $scope.nameSpace + settingsTabName : settingsTabName;
                dataStr += '<tabVisibilities><tab>' + settingsTabName + '</tab><visibility>DefaultOn</visibility></tabVisibilities>';
                dataStr += '</metadata></createMetadata></env:Body></env:Envelope>';

                $http.post(baseUrl + '/services/Soap/m/38.0', dataStr, {
                    headers: { 'SOAPAction': '""', 'Content-Type': 'text/xml', contentType: "text/xml" }
                }).then(function (res) {
                    $scope.creatingProfile = false;

                    settingsUtils.callRemoteAction(remoteActions.createOptUser).then(function (optUserId) {
                        alert('Optimization user ' + optUserId + ' was created and optimization profile was assigned to it. Please switch to this user in order to apply optimization');
                        window.location.reload();
                    }, function (err) {
                        $scope.creatingProfile = false;
                        var exceptionObj = JSON.parse(err.message);
                        alert(exceptionObj.msg);

                        if (exceptionObj.eraseProfile) {
                            var dataStr = '<?xml version="1.0" encoding="UTF-8"?><env:Envelope xmlns:env="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><env:Header><SessionHeader xmlns="http://soap.sforce.com/2006/04/metadata"><sessionId>' + $scope.sessionId + '</sessionId></SessionHeader></env:Header><env:Body><deleteMetadata xmlns="http://soap.sforce.com/2006/04/metadata"><type>Profile</type><fullNames>Field Service Optimization</fullNames></deleteMetadata></env:Body></env:Envelope>';
                            $http.post(baseUrl + '/services/Soap/m/38.0', dataStr, {
                                data: dataStr,
                                contentType: "text/xml",
                                headers: { 'SOAPAction': '""' },
                                success: function success(res) {}
                            });
                        } else {
                            window.location.reload();
                        }
                    });
                }).catch(function () {
                    $scope.creatingProfile = false;
                    alert('Something went wrong. Contact to your system administrator for help');
                });
            };

            $scope.addFieldsPermission = function (orgFields) {
                var fieldsAjaxStr = '';

                if (!!orgFields) {
                    for (var i = 0; i < orgFields.length; i++) {
                        var fieldStr = orgFields[i].getElementsByTagName('field')[0].textContent;
                        fieldsAjaxStr += '<fieldLevelSecurities><field>' + fieldStr + '</field><editable>false</editable><readable>false</readable><hidden>true</hidden></fieldLevelSecurities>';
                    }
                }

                return fieldsAjaxStr;
            };

            $scope.addPagesPermission = function (orgPages) {
                var pagesAjaxStr = '';
                orgPages.disabled.forEach(function (pageStr) {
                    pagesAjaxStr += '<pageAccesses><apexPage>' + pageStr + '</apexPage><enabled>false</enabled></pageAccesses>';
                });

                orgPages.enabled.forEach(function (pageStr) {
                    pagesAjaxStr += '<pageAccesses><apexPage>' + pageStr + '</apexPage><enabled>true</enabled></pageAccesses>';
                });

                return pagesAjaxStr;
            };

            $scope.addUserPermissions = function (orgPermissions) {
                var permAjaxStr = '';
                orgPermissions.disabled.forEach(function (permStr) {
                    permAjaxStr += '<userPermissions><name>' + permStr + '</name><enabled>false</enabled></userPermissions>';
                });

                orgPermissions.enabled.forEach(function (permStr) {
                    permAjaxStr += '<userPermissions><name>' + permStr + '</name><enabled>true</enabled></userPermissions>';
                });

                return permAjaxStr;
            };

            $scope.addApps = function (orgApps) {
                var appsAjaxStr = '';
                orgApps.disabled.forEach(function (appStr) {
                    appsAjaxStr += '<applicationVisibilities><application>' + appStr + '</application><default>false</default><visible>false</visible></applicationVisibilities>';
                });

                orgApps.enabled.forEach(function (appStr) {
                    appsAjaxStr += '<applicationVisibilities><application>' + appStr + '</application><default>true</default><visible>true</visible></applicationVisibilities>';
                });

                return appsAjaxStr;
            };

            $scope.addRecordTypes = function (orgRecTypes) {
                var recAjaxStr = '';
                orgRecTypes.disabled.forEach(function (recType) {
                    recAjaxStr += '<recordTypeVisibilities><recordType>' + recType + '</recordType><visible>false</visible><default>false</default></recordTypeVisibilities>';
                });

                return recAjaxStr;
            };

            $scope.addClassesPermission = function (orgClasses) {
                var classesAjaxStr = '';
                orgClasses.disabled.forEach(function (classStr) {
                    classesAjaxStr += '<classAccesses><apexClass>' + classStr + '</apexClass><enabled>false</enabled></classAccesses>';
                });

                orgClasses.enabled.forEach(function (classStr) {
                    classesAjaxStr += '<classAccesses><apexClass>' + classStr + '</apexClass><enabled>true</enabled></classAccesses>';
                });

                return classesAjaxStr;
            };

            $scope.addObjectsPermission = function (orgObjects) {
                var objectsAjaxStr = '';
                orgObjects.disabled.forEach(function (objStr) {
                    objectsAjaxStr += '<objectPermissions><allowCreate>false</allowCreate><allowDelete>false</allowDelete><allowEdit>false</allowEdit><allowRead>false</allowRead><modifyAllRecords>false</modifyAllRecords><object>' + objStr + '</object><viewAllRecords>false</viewAllRecords></objectPermissions>';
                });

                return objectsAjaxStr;
            };

            $scope.isValidToDeactivateEdge = function () {

                $scope.settings = dataService.getDraftSettings();

                var DeactivateEdgeResult = { isValidToDeactivateEdge: true, msg: 'Notice\nThe following features are available only for Enhanced Optimization and should be deactivated:\n' };

                if ($scope.hasInDayPolicies) {
                    DeactivateEdgeResult.msg += '\nIn Day Optimization';
                    DeactivateEdgeResult.isValidToDeactivateEdge = false;
                }

                if ($scope.settings.LogicSettings[fieldNames.Logic_Settings__c.Use_Predictive__c] == true) {
                    DeactivateEdgeResult.msg += '\nPredictive routing';
                    DeactivateEdgeResult.isValidToDeactivateEdge = false;
                }

                if (schedulingRecipesService.hasActiveRecipe()) {
                    DeactivateEdgeResult.msg += '\nScheduling Recipes (You have at least one active recipe in your org)';
                    DeactivateEdgeResult.isValidToDeactivateEdge = false;
                }

                return DeactivateEdgeResult;
            };

            $scope.toggleEdgeOptimization = function () {

                if (!$scope.showEnhancedToggle && !$scope.EdgeOptimizationEnabled) return;

                if ($scope.EdgeOptimizationEnabled === true) {
                    var res = $scope.isValidToDeactivateEdge();

                    if (res.isValidToDeactivateEdge === false) {
                        alert(res.msg);
                        return;
                    }
                }

                if ($scope.EdgeRemoteSiteIsInactive) {
                    return;
                }

                $scope.EdgeOptimizationEnabled = !$scope.EdgeOptimizationEnabled;

                for (var optSetting in $scope.settings.OptimizationSettings) {
                    $scope.settings.OptimizationSettings[optSetting][fieldNames.OptimizationSettings__c.Use_Edge__c] = $scope.EdgeOptimizationEnabled;
                }
            };

            $scope.getEdgeRemoteSiteStatus = function () {

                var dataStr = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:tooling.soap.sforce.com">' + '<soapenv:Header>' + '<urn:SessionHeader>' + '<urn:sessionId>' + $scope.sessionId + '</urn:sessionId>' + '</urn:SessionHeader>' + '</soapenv:Header>' + '<soapenv:Body>' + '<urn:query>' + '<urn:queryString>SELECT id, SiteName, EndpointUrl, isActive FROM RemoteSiteSetting WHERE EndpointUrl = \'https://fsl-optimize.cloud.clicksoftware.com\'</urn:queryString>' + '</urn:query>' + '</soapenv:Body>' + '</soapenv:Envelope>';

                $http.post(baseUrl + '/services/Soap/T/38.0', dataStr, { headers: { 'SOAPAction': '""', 'Content-Type': 'text/xml', contentType: "text/xml" } }).then(function (res) {
                    var parser = new DOMParser();
                    var xmlDoc = parser.parseFromString(res.data, "text/xml");
                    var res = xmlDoc.getElementsByTagName("sf:IsActive");

                    if (res == undefined || res.length == 0 || res[0] == undefined || res[0].innerHTML == "false") {
                        $scope.EdgeRemoteSiteIsInactive = true;
                        $scope.EdgeRemoteSiteIsInactiveMsg = "Please first activate FSL_Optimize remote site";
                    } else {
                        $scope.EdgeRemoteSiteIsInactive = false;
                        $scope.EdgeRemoteSiteIsInactiveMsg = "";
                    }

                    for (var optSetting in $scope.settings.OptimizationSettings) {
                        if ($scope.settings.OptimizationSettings[optSetting][fieldNames.OptimizationSettings__c.Use_Edge__c] === false) {
                            $scope.EdgeOptimizationEnabled = false;
                            break;
                        }
                        if ($scope.settings.OptimizationSettings[optSetting][fieldNames.OptimizationSettings__c.Use_Edge__c] === true) {
                            $scope.EdgeOptimizationEnabled = true;
                        }
                    }

                    $scope.EdgeOptimizationEnabled = $scope.useEdgeFMA === null ? $scope.EdgeOptimizationEnabled : $scope.EdgeOptimizationEnabled || $scope.useEdgeFMA;

                    $scope.isLoading = false;
                }, function (res) {
                    // console.log(res);
                });
            };

            $scope.toggleOptimizationInsights = function (baseUrl) {

                if ($scope.isOptimizationProfileExist) {

                    //turn on new custom setting for optimization insights
                    $scope.insightsEnabled = !$scope.insightsEnabled;
                    $scope.settings.LogicSettings[fieldNames.Logic_Settings__c.Enable_Optimization_Insights__c] = $scope.insightsEnabled ? true : false;

                    // if (!$scope.insightsEnabled)
                    //     return;

                    //add permission to FSL Optimization user for insights REST class
                    // settingsUtils.callRemoteAction(remoteActions.getInsightsProperties).then(function(orgProp) {
                    //     let baseUrl = window.location.origin;
                    //     let settingsTabName = 'Master_Settings';
                    //     let dataStr = '<?xml version="1.0" encoding="UTF-8"?><env:Envelope xmlns:env="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><env:Header><SessionHeader xmlns="http://soap.sforce.com/2006/04/metadata"><sessionId>' + $scope.sessionId + '</sessionId></SessionHeader></env:Header><env:Body><updateMetadata xmlns="http://soap.sforce.com/2006/04/metadata"><metadata xsi:type="Profile"><fullName>FSL Optimization</fullName>';
                    //     dataStr +='<classAccesses><apexClass>' + orgProp.classStr + '</apexClass><enabled>true</enabled></classAccesses>'

                    //     settingsTabName = $scope.nameSpace != '' ? $scope.nameSpace + settingsTabName : settingsTabName;
                    //     dataStr += '<tabVisibilities><tab>' + settingsTabName + '</tab><visibility>DefaultOn</visibility></tabVisibilities>';
                    //     dataStr += '</metadata></updateMetadata></env:Body></env:Envelope>';

                    //     $http.post(baseUrl + '/services/Soap/m/38.0', dataStr, {
                    //         headers: {'SOAPAction': '""', 'Content-Type': 'text/xml' , contentType:"text/xml"}
                    //     }).then(res => {
                    //         $scope.hasInsightsClassPermission = true;
                    //         console.log(JSON.stringify(res))
                    //     }).catch( (err) => {

                    //         //console.log(JSON.stringify(err))
                    //     });
                    // });
                } else {
                    return;
                }
            };

            $scope.getIcon = function (name) {
                return settings.icons[name];
            };

            if (isOptimizationEnvironmentPickerEnabled) {
                settingsUtils.callRemoteAction(remoteActions.getOptimizationEnvironments).then(function (environments) {
                    $scope.environments = environments;
                }, function (err) {
                    console.log(err);
                });
            }

            $scope.changeOptimizationEnvironment = function () {
                $scope.settings.AuthorizationInfo[0][fieldNames.AuthorizationInfo.Custom_URL__c] = $scope.chosenOptimizationEnvironment;
            };

            $timeout(function () {
                $scope.updateProfile();
            }, 0);
        }

        var template = '\n            <div id="enableSO">\n           \n                <div class="alert-warning-banner" ng-show="!isOptimizationUser && EdgeRemoteSiteIsInactive && !isLoading && !useEdgeFMA">\n                    To turn on Enhanced Optimization, first \n                    <span class="activateLink" ng-click="openLink(\'0rp\')">activate</span>\n                     the related remote site, FSL_Optimize. Then try again.\n                </div>\n\n                <ol class="slds-setup-assistant">\n                    <li class="slds-setup-assistant__item" ng-hide="isLoading || isOptimizationUser">\n                        <article class="slds-setup-assistant__step">\n                        <div class="slds-setup-assistant__step-summary">\n                            <div class="slds-media">\n                            <div class="slds-setup-assistant__step-summary-content slds-media__body">\n                                <h3 class="slds-setup-assistant__step-summary-title slds-text-heading_small" ng-show="!showEnhancedToggle">About Optimization</h3>\n                                <h3 class="slds-setup-assistant__step-summary-title slds-text-heading_small" ng-show="showEnhancedToggle">Enhanced Optimization</h3>\n                                <div ng-show="!showEnhancedToggle && EdgeOptimizationEnabled">Build optimized schedules that let you satisfy service level agreements, minimize travel and overtime, and respond quickly to last-minute changes.\n                                    <a href="https://help.salesforce.com/articleView?id=pfs_optimization.htm" class="activateLink" target="_blank">Tell Me More</a>\n                                </div>\n                                <div ng-show="showEnhancedToggle || (!showEnhancedToggle && !EdgeOptimizationEnabled)">Take advantage of smarter travel time estimates, in-day optimization and scheduling \u201Crecipes\u201D that address common scheduling challenges.</div>\n                            </div>\n                            <div class="slds-media__figure slds-media__figure_reverse">\n                                <div class="transitions-checkbox" ng-show="showEnhancedToggle || (!showEnhancedToggle && !EdgeOptimizationEnabled)">\n                                    <span class="checkBoxWrapper" \n                                            ng-click="toggleEdgeOptimization()" \n                                            ng-class="{checked: (EdgeOptimizationEnabled && !EdgeRemoteSiteIsInactive), unchecked: (!EdgeOptimizationEnabled && !EdgeRemoteSiteIsInactive), unregistered: EdgeRemoteSiteIsInactive }" \n                                            title="{{EdgeRemoteSiteIsInactiveMsg}}">\n\n                                        <span class="innerCheckboxValue" \n                                                ng-class="{checked: (EdgeOptimizationEnabled && !EdgeRemoteSiteIsInactive), unchecked: (!EdgeOptimizationEnabled || EdgeRemoteSiteIsInactive)}"/>\n                                        \n                                        <span class="toggled-label">{{EdgeOptimizationEnabled && !EdgeRemoteSiteIsInactive ? \'ON\' : \'OFF\'}}</span>\n                                    </span>\n                                </div>\n                            </div>\n                            </div>\n                        </div>\n                        </article>\n                    </li>\n                    <li class="slds-setup-assistant__item">\n                        <div ng-show="isLoading && !isOptimizationUser" class="edgeOptimizationLoadingContainer">\n                            <img class="loadingImg"  src={{getIcon(\'loading\')}} />\n                        </div>\n                        <article class="slds-setup-assistant__step">\n                        <div class="slds-setup-assistant__step-summary">\n                            <div class="slds-media">\n                            <div class="slds-setup-assistant__step-summary-content slds-media__body">\n                                <h3 class="slds-setup-assistant__step-summary-title slds-text-heading_small">Optimization Profile and Activation</h3>\n                                <div>\n                                    Create an optimization profile and user for your optimization requests. After you set up this user, you\'re ready to optimize.\n                                    <a href="https://help.salesforce.com/articleView?id=pfs_activate_optimizer.htm" class="activateLink" target="_blank">Here\'s What to Do</a>\n                                    <br>\n                                    <br>\n                                    <span ng-show="!authorized">{{infoMsg}}</span>\n                                    <div ng-show="authorized" class="optActive">The optimization service is active.</div>\n                                    <span ng-show="authorized" class="activatedText">User {{auth.user}} activated the optimization.<span am-time-ago="auth.moment"></span></span><br/><br/>\n                                </div>\n                            </div>\n                            <div class="slds-media__figure slds-media__figure_reverse">\n                                <div ng-click="!enableOptimizationBtn||activateOptimization()" ng-hide="!enableOptimizationBtn" ng-class="{authButton: enableOptimizationBtn}" >\n                                    <span ng-show="!creatingProfile">{{activationMsg}}</span>\n                                    <img class="button-loader"  src={{getIcon("loading")}} ng-show="creatingProfile"/>\n                                </div>\n        \n                                <div ng-show="creatingProfile" id="creatingProfileInformer">\n                                    Creating Optimization Profile... Please Wait.\n                                </div>\n                            </div>\n                            </div>\n                        </div>\n                        </article>\n                    </li>\n                    <li class="slds-setup-assistant__item" ng-hide="isLoading || isOptimizationUser">\n                        <article class="slds-setup-assistant__step">\n                        <div class="slds-setup-assistant__step-summary">\n                            <div class="slds-media">\n                                <div class="slds-setup-assistant__step-summary-content slds-media__body">\n                                    <h3 class="slds-setup-assistant__step-summary-title slds-text-heading_small inline-header">Optimization Insights</h3>\n                                    <div>Gain visibility into optimization results. Track how KPIs change as you refine your scheduling policies.\n                                        <a href="https://help.salesforce.com/articleView?id=pfs_monitor_optimization_insights.htm" class="activateLink" target="_blank">Tell Me More</a>\n                                    </div>\n                                </div>\n                                <div class="slds-media__figure slds-media__figure_reverse">\n                                <div class="transitions-checkbox">\n                                    <span class="checkBoxWrapper" \n                                            ng-click="toggleOptimizationInsights()" \n                                            ng-class="{checked: insightsEnabled, unchecked: !insightsEnabled, unregistered: !isOptimizationProfileExist}" \n                                            title="{{insightsEnabled ? \'Toggle off\' : \'Toggle on\'}}">\n\n                                        <span class="innerCheckboxValue" \n                                                ng-class="{checked: insightsEnabled, unchecked: !insightsEnabled }"/>\n                                        \n                                        <span class="toggled-label">{{insightsEnabled ? \'ON\' : \'OFF\'}}</span>\n                                    </span>\n                                </div>\n                            \n                            </div>\n                        </div>\n                        </article>\n                    </li>\n                    <li class="slds-setup-assistant__item" ng-hide="isLoading || isOptimizationUser || !isOptimizationEnvironmentPickerEnabled">\n                    <article class="slds-setup-assistant__step">\n                    <div class="slds-setup-assistant__step-summary">\n                        <div class="slds-media">\n                            <div class="slds-setup-assistant__step-summary-content slds-media__body">\n                                <h3 class="slds-setup-assistant__step-summary-title slds-text-heading_small inline-header">Optimization Environment</h3>\n                                <div>Select an optimization service environment\n                                </div>\n                            </div>\n                            <div class="select-container">\n                            <select class="slds-select" ng-change="changeOptimizationEnvironment()" ng-model="chosenOptimizationEnvironment">\n                                <option ng-repeat="(key,value) in environments" value="{{value}}"> {{ key }} </option>\n                            </select>\n                        \n                        </div>\n                    </div>\n                    </article>\n                </li>    \n                </ol>\n            \n\t\t        \n\t\t\t</div>\n        ';

        return {
            restrict: 'E',
            scope: {
                verifyFunctions: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('optimizationJobs', optimizationJobs);

    optimizationJobs.$inject = [];

    function optimizationJobs() {

        controllerFunction.$inject = ['$scope', 'dataService', '$rootScope'];

        function controllerFunction($scope, dataService, $rootScope) {

            $scope.verifyFunctions.push(function () {
                return console.log('verify - optimizationJobs');
            });

            $rootScope.$on('settingsUpdated', function () {
                $scope.automators = dataService.getAutomators('Sched004_OAAS');
            });

            dataService.getSettingsPromise().then(function () {
                $scope.automators = dataService.getAutomators('Sched004_OAAS');
            });
        }

        var template = '\n        <div class="automatorExp">Create scheduled optimization runs.</div>\n        \n        <automators objects="automators" class-names="[\'Sched004_OAAS\']"></automators>\n        ';

        return {
            restrict: 'E',
            scope: {
                formObject: '=',
                verifyFunctions: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('optimizationLogic', optimizationLogic);

    optimizationLogic.$inject = [];

    function optimizationLogic() {

        controllerFunction.$inject = ['$scope', 'dataService', 'primitiveType', 'serviceAppointmentLifeCycleService', '$q', '$rootScope', 'OPTIMIZATION_RUNTIME_VALUES'];

        function controllerFunction($scope, dataService, primitiveType, serviceAppointmentLifeCycleService, $q, $rootScope, OPTIMIZATION_RUNTIME_VALUES) {

            $scope.verifyFunctions.push(function () {
                return console.log('verify - optimizationLogic');
            });
            $scope.pinnedStatuses = {};
            $scope.RsoPinnedStatuses = {};
            $scope.primitiveType = primitiveType;
            $scope.disableOptimizationRunTime = false;
            $scope.bgoOptimizationSettingsFieldName = window.bgoOptimizationSettings;

            dataService.getSettingsPromise().then(function () {
                $scope.settings = dataService.getDraftSettings();

                var values = Object.keys(OPTIMIZATION_RUNTIME_VALUES).map(function (key) {
                    return OPTIMIZATION_RUNTIME_VALUES[key];
                });

                $scope.disableOptimizationRunTime = values.indexOf($scope.settings.OptimizationSettings[bgoOptimizationSettings][fieldNames.OptimizationSettings__c.Max_Runtime_Single_Service__c]) == -1;
                $scope.bgoSettings = $scope.settings.OptimizationSettings[bgoOptimizationSettings];
            });

            $q.all([serviceAppointmentLifeCycleService.loadData(), dataService.getSettingsPromise()]).then(function () {

                $scope.statuses = serviceAppointmentLifeCycleService.settings.StatusList;

                $scope.statuses.forEach(function (status) {
                    //BGO
                    if ($scope.settings.OptimizationSettings[bgoOptimizationSettings][fieldNames.OptimizationSettings__c.Pinned_Statuses__c]) {
                        $scope.pinnedStatuses[status.value] = $scope.settings.OptimizationSettings[bgoOptimizationSettings][fieldNames.OptimizationSettings__c.Pinned_Statuses__c].split(',').indexOf(status.value) > -1;
                    }

                    //RSO
                    if ($scope.settings.OptimizationSettings[rdoOptimizationSettings][fieldNames.OptimizationSettings__c.Pinned_Statuses__c]) {
                        $scope.RsoPinnedStatuses[status.value] = $scope.settings.OptimizationSettings[rdoOptimizationSettings][fieldNames.OptimizationSettings__c.Pinned_Statuses__c].split(',').indexOf(status.value) > -1;
                    }
                });
            });

            $rootScope.$on('settingsUpdated', function () {
                $scope.statuses.forEach(function (status) {
                    //BGO
                    if ($scope.settings.OptimizationSettings[bgoOptimizationSettings][fieldNames.OptimizationSettings__c.Pinned_Statuses__c]) {
                        $scope.pinnedStatuses[status.value] = $scope.settings.OptimizationSettings[bgoOptimizationSettings][fieldNames.OptimizationSettings__c.Pinned_Statuses__c].split(',').indexOf(status.value) > -1;
                    }

                    //RSO
                    if ($scope.settings.OptimizationSettings[rdoOptimizationSettings][fieldNames.OptimizationSettings__c.Pinned_Statuses__c]) {
                        $scope.RsoPinnedStatuses[status.value] = $scope.settings.OptimizationSettings[rdoOptimizationSettings][fieldNames.OptimizationSettings__c.Pinned_Statuses__c].split(',').indexOf(status.value) > -1;
                    }
                });
            });

            $scope.optimizationRunTimeOptions = [{ label: 'Low', value: OPTIMIZATION_RUNTIME_VALUES.LOW }, { label: 'Medium', value: OPTIMIZATION_RUNTIME_VALUES.MEDIUM }, { label: 'High', value: OPTIMIZATION_RUNTIME_VALUES.HIGH }];

            $scope.updateSettings = function (which) {

                var statuses = [];

                var pinned = which == 'bgo' ? $scope.pinnedStatuses : $scope.RsoPinnedStatuses;

                for (var key in pinned) {
                    if (pinned[key]) {
                        statuses.push(key);
                    }
                }

                if (which == 'bgo') $scope.settings.OptimizationSettings[bgoOptimizationSettings][fieldNames.OptimizationSettings__c.Pinned_Statuses__c] = statuses.join(',');else if (which == 'rso') {
                    $scope.settings.OptimizationSettings[rdoOptimizationSettings][fieldNames.OptimizationSettings__c.Pinned_Statuses__c] = statuses.join(',');
                    $scope.settings.OptimizationSettings[inDayOptimizationSettings][fieldNames.OptimizationSettings__c.Pinned_Statuses__c] = statuses.join(',');
                }
                dataService.setDirty();
            };
        }

        var template = '\n            <div class="section-settings" id="__general-opt">General Logic</div>\n\n            <custom-settings-wrapper primitive-type="primitiveType.boolean" label="\'Enable optimization overlaps prevention\'" value-field-name="\'Run__c\'" setting="settings.TriggerConfigurations[\'Enable req overlaps prevention\']" tooltip-text="When checked - overlapping optimization requests will fail"></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.boolean" label="\'Mark optimization requests failed when failing due to org customizations\'" value-field-name="\'Run__c\'" setting="settings.TriggerConfigurations[\'Enable optimization failure\']" tooltip-text="If customizations to the org cause the scheduling optimization to fail, set the request status to Failed. If this option isn\u2019t selected, the status is set to Completed."></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.boolean" label="\'Enable sharing for Optimization request\'" value-field-name="\'Run__c\'" setting="settings.TriggerConfigurations[\'Enable sharing for Optimization\']" tooltip-text="When checked - Optimization requests will be shared"></custom-settings-wrapper>\n\n            <div class="section-settings" id="__bgo-opt">Global Optimization</div>\n\n            <custom-settings-wrapper primitive-type="primitiveType.picklist" is-disabled="disableOptimizationRunTime" options="optimizationRunTimeOptions" label="\'Optimization run time per service appointment\'" value-field-name="\'Max_Runtime_Single_Service__c\'" setting="settings.OptimizationSettings[bgoOptimizationSettingsFieldName]" tooltip-text="Optimization results depend on the length of the optimization run and the number of iterations required to get close to an optimal solution. In cases where there are many candidates for each service appointment, or when longer travel calculations are required and SLR is turned on, it is necessary to allow the optimization engine more time to get closer to the optimal solution. In these cases it is recommended to use the Medium or High time levels where Medium will target faster results  and High will run even longer and try to achieve higher optimization quality. When SLR is turned off and there aren\'t many candidates for each service appointment use the Low time level to achieve the quickest results or Medium for a better quality schedule."></custom-settings-wrapper>\n\n            During global optimization, service appointments with a status selected below will not be changed.<br/>\n            \n            <div id="pinned-status-container">\n                <label for="OptimizationPinnedStatus{{$index}}" class="optimizaion-pinned-label truncate" ng-repeat="status in statuses track by $index" title="{{ status.value }}">\n                    <input type="checkbox" id="OptimizationPinnedStatus{{$index}}" ng-model="pinnedStatuses[status.value]" ng-change="updateSettings(\'bgo\')" />{{ status.value }}\n                </label>\n            </div>\n\n            <div class="section-settings" id="__rso-opt">In-Day and Resource Schedule Optimization</div>\n            \n            <br/>During resource schedule optimization and in-day optimization, service appointments with a status selected below will not be changed.<br/>\n            \n            <div id="pinned-status-container">\n                <label for="ResourceOptimizationPinnedStatus{{$index}}" class="optimizaion-pinned-label truncate" ng-repeat="status in statuses track by $index">\n                    <input type="checkbox" id="ResourceOptimizationPinnedStatus{{$index}}" ng-model="RsoPinnedStatuses[status.value]" ng-change="updateSettings(\'rso\')" />{{ status.value }}\n                </label>\n            </div>\n        ';

        return {
            restrict: 'E',
            scope: {
                verifyFunctions: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('optimizationParameters', optimizationParameters);

    optimizationParameters.$inject = ['dataService'];

    function optimizationParameters(dataService) {

        controllerFunction.$inject = ['$scope', 'primitiveType'];

        function controllerFunction($scope, primitiveType) {

            $scope.primitiveType = primitiveType;

            $scope.verifyFunctions.push(function () {
                return console.log('verify - optimizationParameters');
            });

            dataService.getSettingsPromise().then(function () {
                $scope.settings = dataService.getDraftSettings();
                $scope.serviceBoleanFields = angular.copy(dataService.serviceBooleanFields);
                $scope.serviceDateFields = angular.copy(dataService.serviceDateFields);
                $scope.serviceIntegerFields = angular.copy(dataService.serviceIntegerFields);
                $scope.serviceDoubleFields = angular.copy(dataService.serviceDoubleFields);
                $scope.serviceStringFields = angular.copy(dataService.serviceStringFields);
                $scope.resourceBoleanFields = angular.copy(dataService.resourceCheckboxFields);
                $scope.resourceDateFields = angular.copy(dataService.resourceDateFields);
                $scope.resourceIntegerFields = angular.copy(dataService.resourceIntegerFields);
                $scope.resourceDoubleFields = angular.copy(dataService.resourceDoubleFields);
                $scope.resourceStringFields = angular.copy(dataService.resourceStringFields);

                $scope.serviceBoleanFields.unshift({ value: null, label: '--- Select a field ---' });
                $scope.serviceDateFields.unshift({ value: null, label: '--- Select a field ---' });
                $scope.serviceIntegerFields.unshift({ value: null, label: '--- Select a field ---' });
                $scope.serviceDoubleFields.unshift({ value: null, label: '--- Select a field ---' });
                $scope.serviceStringFields.unshift({ value: null, label: '--- Select a field ---' });
                $scope.resourceBoleanFields.unshift({ value: null, label: '--- Select a field ---' });
                $scope.resourceDateFields.unshift({ value: null, label: '--- Select a field ---' });
                $scope.resourceIntegerFields.unshift({ value: null, label: '--- Select a field ---' });
                $scope.resourceDoubleFields.unshift({ value: null, label: '--- Select a field ---' });
                $scope.resourceStringFields.unshift({ value: null, label: '--- Select a field ---' });
            });
        }

        var template = '\n            <content-collapse-wrapper header="\'Service Optimization - Additional properties\'" open="false">\n                <content>\n                    <custom-settings-wrapper options="serviceBoleanFields" primitive-type="primitiveType.picklist" label-field-name="\'Label__c\'" value-field-name="\'SF_Field_Name__c\'" setting="settings.SoFieldsMapping.Service__Boolean1"></custom-settings-wrapper>    \n                    <custom-settings-wrapper options="serviceBoleanFields" primitive-type="primitiveType.picklist" label-field-name="\'Label__c\'" value-field-name="\'SF_Field_Name__c\'" setting="settings.SoFieldsMapping.Service__Boolean2"></custom-settings-wrapper>\n                    <custom-settings-wrapper options="serviceDateFields" primitive-type="primitiveType.picklist" label-field-name="\'Label__c\'" value-field-name="\'SF_Field_Name__c\'" setting="settings.SoFieldsMapping.Service__Date1"></custom-settings-wrapper>    \n                    <custom-settings-wrapper options="serviceDateFields" primitive-type="primitiveType.picklist" label-field-name="\'Label__c\'" value-field-name="\'SF_Field_Name__c\'" setting="settings.SoFieldsMapping.Service__Date2"></custom-settings-wrapper>\n                    <custom-settings-wrapper options="serviceIntegerFields" primitive-type="primitiveType.picklist" label-field-name="\'Label__c\'" value-field-name="\'SF_Field_Name__c\'" setting="settings.SoFieldsMapping.Service__Integer1"></custom-settings-wrapper>    \n                    <custom-settings-wrapper options="serviceIntegerFields" primitive-type="primitiveType.picklist" label-field-name="\'Label__c\'" value-field-name="\'SF_Field_Name__c\'" setting="settings.SoFieldsMapping.Service__Integer2"></custom-settings-wrapper>\n                    <custom-settings-wrapper options="serviceDoubleFields" primitive-type="primitiveType.picklist" label-field-name="\'Label__c\'" value-field-name="\'SF_Field_Name__c\'" setting="settings.SoFieldsMapping.Service__Double1"></custom-settings-wrapper>    \n                    <custom-settings-wrapper options="serviceDoubleFields" primitive-type="primitiveType.picklist" label-field-name="\'Label__c\'" value-field-name="\'SF_Field_Name__c\'" setting="settings.SoFieldsMapping.Service__Double2"></custom-settings-wrapper>\n                    <custom-settings-wrapper options="serviceStringFields" primitive-type="primitiveType.picklist" label-field-name="\'Label__c\'" value-field-name="\'SF_Field_Name__c\'" setting="settings.SoFieldsMapping.Service__String1"></custom-settings-wrapper>    \n                    <custom-settings-wrapper options="serviceStringFields" primitive-type="primitiveType.picklist" label-field-name="\'Label__c\'" value-field-name="\'SF_Field_Name__c\'" setting="settings.SoFieldsMapping.Service__String2"></custom-settings-wrapper>\n                </content>\n           </content-collapse-wrapper>\n           \n           <content-collapse-wrapper header="\'Resource Optimization - Additional properties\'" open="false">\n                <content>\n                    <custom-settings-wrapper options="resourceBoleanFields" primitive-type="primitiveType.picklist" label-field-name="\'Label__c\'" value-field-name="\'SF_Field_Name__c\'" setting="settings.SoFieldsMapping.Resource__Boolean1"></custom-settings-wrapper>    \n                    <custom-settings-wrapper options="resourceBoleanFields" primitive-type="primitiveType.picklist" label-field-name="\'Label__c\'" value-field-name="\'SF_Field_Name__c\'" setting="settings.SoFieldsMapping.Resource__Boolean2"></custom-settings-wrapper>\n                    <custom-settings-wrapper options="resourceDateFields" primitive-type="primitiveType.picklist" label-field-name="\'Label__c\'" value-field-name="\'SF_Field_Name__c\'" setting="settings.SoFieldsMapping.Resource__Date1"></custom-settings-wrapper>    \n                    <custom-settings-wrapper options="resourceDateFields" primitive-type="primitiveType.picklist" label-field-name="\'Label__c\'" value-field-name="\'SF_Field_Name__c\'" setting="settings.SoFieldsMapping.Resource__Date2"></custom-settings-wrapper>\n                    <custom-settings-wrapper options="resourceIntegerFields" primitive-type="primitiveType.picklist" label-field-name="\'Label__c\'" value-field-name="\'SF_Field_Name__c\'" setting="settings.SoFieldsMapping.Resource__Integer1"></custom-settings-wrapper>    \n                    <custom-settings-wrapper options="resourceIntegerFields" primitive-type="primitiveType.picklist" label-field-name="\'Label__c\'" value-field-name="\'SF_Field_Name__c\'" setting="settings.SoFieldsMapping.Resource__Integer2"></custom-settings-wrapper>\n                    <custom-settings-wrapper options="resourceDoubleFields" primitive-type="primitiveType.picklist" label-field-name="\'Label__c\'" value-field-name="\'SF_Field_Name__c\'" setting="settings.SoFieldsMapping.Resource__Double1"></custom-settings-wrapper>    \n                    <custom-settings-wrapper options="resourceDoubleFields" primitive-type="primitiveType.picklist" label-field-name="\'Label__c\'" value-field-name="\'SF_Field_Name__c\'" setting="settings.SoFieldsMapping.Resource__Double2"></custom-settings-wrapper>\n                    <custom-settings-wrapper options="resourceStringFields" primitive-type="primitiveType.picklist" label-field-name="\'Label__c\'" value-field-name="\'SF_Field_Name__c\'" setting="settings.SoFieldsMapping.Resource__String1"></custom-settings-wrapper>    \n                    <custom-settings-wrapper options="resourceStringFields" primitive-type="primitiveType.picklist" label-field-name="\'Label__c\'" value-field-name="\'SF_Field_Name__c\'" setting="settings.SoFieldsMapping.Resource__String2"></custom-settings-wrapper>\n                </content>\n           </content-collapse-wrapper>\n        ';

        return {
            restrict: 'E',
            scope: {
                verifyFunctions: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('schedulingBundling', schedulingBundling);

    schedulingBundling.$inject = [];

    function schedulingBundling() {

        controllerFunction.$inject = ['$scope', 'primitiveType', 'dataService', 'settingsUtils', '$timeout'];

        function controllerFunction($scope, primitiveType, dataService, settingsUtils, $timeout) {

            function getRangeArray(start, end) {

                var arr = [];

                for (var i = start; i <= end; i++) {
                    arr.push(i);
                }

                return arr;
            }

            $scope.dayOfWeekLookup = {
                'SUN': '0',
                'MON': '1',
                'TUE': '2',
                'WED': '3',
                'THU': '4',
                'FRI': '5',
                'SAT': '6'
            };

            function joinElements(selectedElements) {
                if (selectedElements === undefined || selectedElements.length === 0) {

                    return '*';
                } else {
                    return selectedElements.join(",");
                }
            }

            $scope.bdaysOfWeek = [{ label: 'Sun', value: 'SUN' }, { label: 'Mon', value: 'MON' }, { label: 'Tue', value: 'TUE' }, { label: 'Wed', value: 'WED' }, { label: 'Thu', value: 'THU' }, { label: 'Fri', value: 'FRI' }, { label: 'Sat', value: 'SAT' }];

            $scope.minutesOptions = [15, 30];

            $scope.bdaysOfMonth = getRangeArray(1, 31);
            $scope.bdaysOfMonthWithLabel = [];

            for (var i = 0; i < $scope.bdaysOfMonth.length; i++) {
                $scope.bdaysOfMonthWithLabel.push({
                    label: $scope.bdaysOfMonth[i].toString(),
                    value: $scope.bdaysOfMonth[i].toString()
                });
            }

            $scope.allHours = getRangeArray(0, 23);
            $scope.allMinutes = getRangeArray(0, 59);

            $scope.selected = { months: [],
                daysMonth: [],
                daysWeek: []
            };

            $scope.parseNumber = function (str) {

                if (str) return parseInt(str);
                return 0;
            };

            $scope.isBundleOn = function () {

                var nsValueField = orgNameSpace + 'Value__c';

                return this.settings && this.settings.GeneralConfig && this.settings.GeneralConfig['Enable Scheduling Bundling'] && this.settings.GeneralConfig['Enable Scheduling Bundling'][nsValueField] == '1';
            };

            var setDefaultValues = function setDefaultValues($scope) {

                $scope.dayMonth = $scope.bdaysOfMonth[0];
                $scope.hours = $scope.allHours[23];
                $scope.minutes = $scope.allMinutes[0];
                $scope.selected.months = [];
                $scope.recurringDay = 'dayWeek';
                $scope.selected.daysMonth = [];
                $scope.selected.daysWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

                ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].forEach(function (e) {

                    $('.bundlerMonthAndDays #bdaysOfWeek' + $scope.dayOfWeekLookup[e]).prop("checked", true);
                });
            };

            function setValues($scope, cronExpr) {

                var regExps = {
                    'recurringDayWeek': /(SUN|MON|TUE|WED|THU|FRI|SAT)(,SUN|,MON|,TUE|,WED|,THU|,FRI|,SAT)*\s\*$/
                };

                var argsCron = cronExpr.split(' ');

                var minutes = argsCron[1],
                    hours = argsCron[2];

                $scope.hours = $scope.parseNumber(hours);
                $scope.minutes = $scope.parseNumber(minutes);

                if (regExps.recurringDayWeek.test(cronExpr)) {
                    // days of week

                    $scope.recurringDay = 'dayWeek';

                    $scope.selected.months = argsCron[4].split(',');
                    $scope.selected.daysWeek = argsCron[5].split(',');

                    var selectedDaysWeek = [];

                    if ($scope.selected.daysWeek == '?') {
                        selectedDaysWeek = getRangeArray(0, 6);
                    } else {
                        selectedDaysWeek = $scope.selected.daysWeek;
                    }

                    ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].forEach(function (e) {

                        $('.bundlerMonthAndDays #bdaysOfWeek' + $scope.dayOfWeekLookup[e]).prop("checked", false);
                    });

                    selectedDaysWeek.forEach(function (e) {

                        $('.bundlerMonthAndDays #bdaysOfWeek' + $scope.dayOfWeekLookup[e]).prop("checked", true);
                    });
                } else {
                    // day of month

                    $scope.recurringDay = 'dayMonth';

                    $scope.selected.daysMonth = argsCron[3].split(',');
                    $scope.selected.months = argsCron[4].split(',');

                    var selectedDaysMonth = [];
                    if ($scope.selected.daysMonth == '?') {

                        selectedDaysMonth = getRangeArray(1, 31);
                    } else {

                        selectedDaysMonth = $scope.selected.daysMonth;
                    }

                    selectedDaysMonth.forEach(function (e) {
                        var n = e - 1;
                        $('.bundlerMonthAndDays #bdaysOfMonth' + n).prop("checked", true);
                    });
                }

                return true;
            }

            $scope.checkNotEmptyDays = function () {

                if ($scope.recurringDay === 'dayWeek') {

                    return $scope.selected.daysWeek.length > 0;
                }

                return $scope.selected.daysMonth.length > 0;
            };

            $scope.bgetCronExpr = function () {

                // calc new cron expr

                /*
                {1} Seconds - so 0 here i.e. start of the minute.
                {2} Minutes - 0 again so start of the hour.
                {3} Hours -  5 so 5 am. Uses 24 hour notation so 21 = 9pm
                {4} Day_of_month - ? means no specific value, only available for day of the month and day of the week.
                {5} Month - * indicates all values, i.e. every month. (if we only want to run on 1st Jan say, this would be 1)
                {6} Day_of_week -
                */

                //  console.log('bgetCronExpr');

                try {

                    var expr = {
                        sec: "0",
                        min: "0",
                        hour: "0",
                        dayMonth: "*",
                        month: "*",
                        dayWeek: "?",
                        year: "*"
                    };

                    if (!$scope.isBundleOn()) {
                        // shouldDisableToggle

                        var _newExp = expr.sec + " " + expr.min + " " + expr.hour + " " + expr.dayMonth + " " + expr.month + " " + expr.dayWeek + " " + expr.year;
                        return _newExp;
                    }

                    if ($scope.recurringDay === 'dayWeek') {

                        expr.dayMonth = '?';

                        $scope.selected.daysWeek = [];

                        ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].forEach(function (e) {

                            if ($('.bundlerMonthAndDays #bdaysOfWeek' + $scope.dayOfWeekLookup[e]) && $('.bundlerMonthAndDays #bdaysOfWeek' + $scope.dayOfWeekLookup[e]).prop("checked")) {
                                $scope.selected.daysWeek.push(e);
                            }
                        });

                        expr.dayWeek = joinElements($scope.selected.daysWeek);
                    } else {

                        $scope.selected.daysMonth = [];
                        for (var _i = 0; _i <= 30; _i++) {
                            if ($('.bundlerMonthAndDays #bdaysOfMonth' + _i) && $('.bundlerMonthAndDays #bdaysOfMonth' + _i).prop("checked")) {
                                $scope.selected.daysMonth.push(_i + 1);
                            }
                        };

                        expr.dayMonth = joinElements($scope.selected.daysMonth);
                    }

                    expr.hour = $scope.hours;
                    expr.min = $scope.minutes;

                    var newExp = expr.sec + " " + expr.min + " " + expr.hour + " " + expr.dayMonth + " " + expr.month + " " + expr.dayWeek + " " + expr.year;

                    // console.log(newExp);

                    return newExp;
                } catch (ex) {
                    console.log(ex);
                }
            };

            $scope.errors = {};
            $scope.errorMsg = false;

            // nothing to check here, all good
            $scope.verifyFunctions.push(function () {
                return false;
            });

            $scope.primitiveType = primitiveType;
            $scope.settings = dataService.getDraftSettings();

            $scope.shouldDisableToggle = function () {

                var nsValueField = orgNameSpace + 'Value__c';

                if (this.settings && this.settings.GeneralConfig && this.settings.GeneralConfig['Enable Scheduling Bundling'] && this.settings.GeneralConfig['Enable Scheduling Bundling'][nsValueField] == '0') {

                    $scope.wasOff = true; // if the bundle was off we need to show the checkbox.            
                }

                return this.settings.GeneralConfig && !$scope.wasOff && this.settings.GeneralConfig['Enable Scheduling Bundling'] && this.settings.GeneralConfig['Enable Scheduling Bundling'][nsValueField] == '1';
            };

            if (!$scope.isBundleOn()) {
                setDefaultValues($scope); // set defult value at start
            }

            $scope.toggleNightlyTriggerStatusActive = false;
            $scope.serverToggleNightlyTriggerStatusActive = false;
            $scope.btnNightlyTriggerStatusActive = true;
            $scope.showSavingBundleSettingStatus = '';

            // get status, if active get cron , if not then set defualt
            $scope.toggleNightlyStatus = function () {

                settingsUtils.callRemoteAction(remoteActions.nightlyBundleTriggerStatus).then(function (res) {

                    $scope.toggleNightlyTriggerStatusActive = res;

                    if (res) {

                        $scope.getNightlyCronExp();
                    } else {

                        setDefaultValues($scope);
                    }
                }).catch(function (err) {
                    $scope.errorMsg = true;
                });
            };

            $scope.getNightlyCronExp = function () {

                settingsUtils.callRemoteAction(remoteActions.getBundleNightlyCronExp).then(function (res) {

                    if (res) {
                        setValues($scope, res);
                    }
                }).catch(function (err) {
                    $scope.errorMsg = true;
                    $scope.errMsgText = 'Something went  wrong. Please contact our support team if the problem persists.';
                });
            };

            $scope.toggleNightlyStatus(); // get status. start point

            $scope.updateCacheRedisBtnDisabled = false;

            $scope.recurringDayChange = function (event, val) {

                $scope.recurringDay = val;
            };
            $scope.hoursChange = function (event, val) {

                $scope.hours = val;
            };

            $scope.minutesChange = function (event, val) {

                $scope.minutes = val;
            };

            $scope.toggleBundleNightly = function () {

                $scope.toggleNightlyTriggerStatusActive = !$scope.toggleNightlyTriggerStatusActive;
            };

            $scope.toggleBundleNightlyTrigger = function () {

                $scope.btnNightlyTriggerStatusActive = false;

                $scope.errorMsg = false;

                var cornRegx = $scope.bgetCronExpr();

                // check if day selected and is active
                if ($scope.toggleNightlyTriggerStatusActive && !$scope.checkNotEmptyDays()) {
                    $scope.errorMsg = true;
                    $scope.errMsgText = 'Select one or more days.';
                    $scope.btnNightlyTriggerStatusActive = true;
                    return;
                }

                $scope.showSavingBundleSettingStatus = 'IN_PROCCESS';

                settingsUtils.callRemoteAction(remoteActions.toggleBundleNightlyTrigger, [cornRegx, $scope.toggleNightlyTriggerStatusActive]).then(function (res) {

                    $scope.btnNightlyTriggerStatusActive = true;

                    $scope.toggleNightlyTriggerStatusActive = res;

                    $scope.serverToggleNightlyTriggerStatusActive = res; // not used. for 236 desige 

                    if (res) {
                        $scope.getNightlyCronExp();
                    }

                    $scope.doneSavingChange = 'Automated bundling schedule was saved.';
                    $scope.showSavingBundleSettingStatus = 'DONE';

                    $timeout(function () {
                        $scope.showSavingBundleSettingStatus = '';
                    }, 5000);
                }).catch(function (err) {
                    $scope.errorMsg = true;
                    $scope.btnNightlyTriggerStatusActive = true;
                    $scope.showSavingBundleSettingStatus = '';
                    $scope.errMsgText = 'Something went  wrong. Please contact our support team if the problem persists.';
                });
            };

            $scope.updateBundleCacheRedis = function () {

                $scope.updateCacheRedisBtnDisabled = true;
                $scope.showSavingBundleSettingStatus = 'IN_PROCCESS';

                settingsUtils.callRemoteAction(remoteActions.updateBundleCacheRedis).then(function () {

                    //  alert('Configuration changes were updated.');// removed chrome bug 92 W-9651771
                    $scope.updateCacheRedisBtnDisabled = false;

                    $scope.doneSavingChange = 'Configuration changes were updated.';
                    $scope.showSavingBundleSettingStatus = 'DONE';

                    $timeout(function () {
                        $scope.showSavingBundleSettingStatus = '';
                    }, 5000);
                }).catch(function (err) {
                    $scope.errorMsg = true;
                    $scope.showSavingBundleSettingStatus = '';
                    $scope.updateCacheRedisBtnDisabled = false;
                    $scope.errMsgText = 'Something went  wrong. Please contact our support team if the problem persists.';
                });
            };
        }

        var template = '\n        <div class="bundle-settings">\n        <div ng-if="shouldDisableToggle()">\n        <p>\n            Service appointment bundles are active. \n        </p>\n    \n    <ol class="slds-setup-assistant">\n\n        <li class="slds-setup-assistant__item" style="" >  <!-- removed. no chach  style="display:none" -->  \n        <article class="slds-setup-assistant__step">\n                <div class="slds-setup-assistant__step-summary">\n                    <div class="slds-media">\n\n                        <div class="slds-setup-assistant__step-summary-content slds-media__body">\n                            <h3 class="slds-setup-assistant__step-summary-title slds-text-heading_small ">Off-Schedule Configuration Updates</h3>\n                            <div > You can update configuration changes now instead of waiting for scheduled updates. \n                            </div>\n                        </div>\n\n                        <div class="slds-media__figure slds-media__figure_reverse">\n                            <input type="button"  ng-disabled="updateCacheRedisBtnDisabled" class="register-button slds-button slds-button_brand select-container" ng-click="updateBundleCacheRedis()" value="Update">\n                        </div>\n                    </div>\n                </div>\n        </article>\n        </li>\n\n        <li class="slds-setup-assistant__item">   \n        <article class="slds-setup-assistant__step" >\n\n                <div class="slds-setup-assistant__step-summary">\n\n                    <div class="slds-media">\n\n                        <div class="slds-setup-assistant__step-summary-content slds-media__body">\n                            <h3 class="slds-setup-assistant__step-summary-title slds-text-heading_small ">Automated Bundling</h3>\n                            <div>Schedule the bundling process during low-activity times.\n                            </div>\n\n                            <div class="automatorMonthAndDays bundlerMonthAndDays" style="width:40rem;float:left;border:0" >\n                                <div class="automatorDays" style="width: 100%;">\n                                    <div class="automatorWeekOrMonth">\n                                        <label>\n                                            <input type="radio" ng-model="recurringDay" ng-click="recurringDayChange($event,\'dayWeek\')" value="dayWeek" ng-disabled="isDisabled">\n                                            Day of week\n                                        </label>\n                                        <label>\n                                            <input type="radio" ng-model="recurringDay" ng-click="recurringDayChange($event,\'dayMonth\')" value="dayMonth" ng-disabled="isDisabled">\n                                         Day of month\n                                        </label>\n                                    </div>\n                                    <cron-exp-rows-of-dates ng-show="recurringDay == \'dayWeek\'" rows="bdaysOfWeek" selected-rows="selected.daysWeek" label-id-prefix="automator.Name + \'bdaysOfWeek\'" is-disabled="isDisabled"></cron-exp-rows-of-dates>\n                                    <cron-exp-rows-of-dates ng-show="recurringDay == \'dayMonth\'" rows="bdaysOfMonthWithLabel" selected-rows="selected.daysMonth" label-id-prefix="automator.Name + \'bdaysOfMonth\'" is-disabled="isDisabled"></cron-exp-rows-of-dates>\n                                </div>\n                            </div>\n        \n                            <div class="automatorHour" style="float: left;border:0">\n                                \n                                <div class="automatorSpecificHour" >\n                                \n                                        <span class="automatorTimeSpan">\n                                            <span class="timeSpanHeader">\n                                                Hour \n                                            </span>\n                                            \n                                            <span class="timeSpanInput">\n                                                <input ng-disabled="isDisabled" ng-click="hoursChange($event,hours)" ng-model="hours" min="0" max="23" onkeydown = "return false;" type="number" class="input-settings">\n                                            </span>\n                                        </span>\n                                        <span class="automatorTimeSpan">\n                                            <span class="timeSpanHeader">\n                                                Minute\n                                            </span>\n            \n                                            <span class="timeSpanInput">\n                                                <input ng-disabled="isDisabled" ng-click="minutesChange($event,minutes)"  ng-model="minutes" min="0" max="55" step="5" type="number" onkeydown = "return false;" class="input-settings">\n                                            </span>\n                                        </span>\n                                </div> <!-- automatorSpecificHour -->\n                            </div> <!-- automatorHour -->\n                        </div> <!-- slds-media__body -->\n\n                            \n\n                        <div class="slds-media__figure slds-media__figure_reverse">\n                        \n                            <div class="transitions-checkbox" >\n                                <span class="checkBoxWrapper" \n                                        ng-click="toggleBundleNightly()" \n                                        ng-class="{checked: toggleNightlyTriggerStatusActive, unchecked: !toggleNightlyTriggerStatusActive  }" \n                                        title="{{EdgeRemoteSiteIsInactiveMsg}}">\n        \n                                    <span class="innerCheckboxValue" \n                                            ng-class="{checked: toggleNightlyTriggerStatusActive, unchecked: !toggleNightlyTriggerStatusActive}"/>\n                                    \n                                    <span class="toggled-label">{{toggleNightlyTriggerStatusActive ? \'ON\' : \'OFF\'}}</span>\n                                </span>\n                            \n                            </div>\n\n                            <div class="slds-media__figure slds-media__figure_reverse" style="padding-top:3rem">\n                                    <input type="button"   class="register-button slds-button slds-button_brand select-container" ng-disabled="!btnNightlyTriggerStatusActive" ng-click="toggleBundleNightlyTrigger()" value="Apply"> \n                             </div>\n\n                        \n                        </div> <!-- slds-media__figure_reverse -->\n                \n                        </div> <!-- slds-media -->\n                        </div> <!-- slds-setup-assistant__step-summary -->\n\n</article>\n        </li>\n    </ol>\n\n<ui-error ng-if="errorMsg">\n<main-content>\n{{errMsgText}}\n</main-content>\n</ui-error>\n \n<div class="saving-banner" ng-show="showSavingBundleSettingStatus != \'\' " ng-class="{\'settings-saved\' : showSavingBundleSettingStatus == \'DONE\'}">\n     <span ng-show="showSavingBundleSettingStatus == \'IN_PROCCESS\' ">Saving changes\u2026</span>\n     <span ng-show="showSavingBundleSettingStatus == \'DONE\' ">{{doneSavingChange}}</span>\n</div>\n\n</div>\n<div ng-if="!shouldDisableToggle()">\n    <custom-settings-wrapper primitive-type="primitiveType.booleanText" \n    label="\'Bundle your service appointments\'" \n    value-field-name="\'Value__c\'" \n    setting="settings.GeneralConfig[\'Enable Scheduling Bundling\']" \n    tooltip-text="Group service appointments to create a single service appointment and facilitate the scheduling process.">\n    </custom-settings-wrapper>\n</div>\n</div>    \n        ';

        return {
            restrict: 'E',
            scope: {
                verifyFunctions: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('schedulingDynamicGantt', schedulingDynamicGantt);

    schedulingDynamicGantt.$inject = [];

    function schedulingDynamicGantt() {

        controllerFunction.$inject = ['$rootScope', '$scope', 'primitiveType', 'dataService'];

        function controllerFunction($rootScope, $scope, primitiveType, dataService) {

            $scope.hasActiveRecipesOfTypeOverlap = true;

            $rootScope.$on('ActiveRecipesOfTypeOverlap', function (ev, data) {
                $scope.hasActiveRecipesOfTypeOverlap = data;
            });

            // nothing to check here, all good
            $scope.verifyFunctions.push(function () {
                return false;
            });

            $scope.primitiveType = primitiveType;
            $scope.settings = dataService.getDraftSettings();

            $scope.queryOrderBy = [{ label: 'Priority', value: 'priority' }, { label: 'Distance', value: 'distance' }];

            $scope.fixOverLapsTreat = [{ label: 'Leave on Gantt and set In-jeopardy', value: 'On Reschedule Failure Set Service To In Jeopardy' }, { label: 'Unschedule the appointment(s)', value: 'Leave service unscheduled' }, { label: 'Reshuffle other assignments', value: 'Call reshuffle' }];

            $scope.onOverlapDetection = [{ label: 'Schedule to original resource only', value: 'Schedule To Original Resource Only' }, { label: 'Schedule to all resources', value: 'Schedule To All Resources' //value: 'Consider all Resources' }
            }];

            $scope.onServicesReschedule = [{ label: 'Chronological Order', value: 'Chronological Order' }, { label: 'Priority', value: 'Priority' }];

            $scope.onReschduleGroupNearBy = [{ label: 'Schedule to original resource only', value: 'Schedule To Original Resource Only' }, { label: 'Schedule to all resources', value: 'Schedule To All Resources' //value: 'Consider all Resources' }
            }];

            dataService.getSettingsPromise().then(function () {
                $scope.saBooleanFields = angular.copy(dataService.serviceBooleanFields);
                $scope.saBooleanFields.shift();

                $scope.woBooleanFields = angular.copy(dataService.woBooleanFields);
                $scope.woBooleanFields.shift();

                $scope.woliBooleanFields = angular.copy(dataService.woliBooleanFields);
                $scope.woliBooleanFields.shift();
            });
        }

        var template = '\n            \n            <div class="section-settings" id="__fix-overlaps">Fix Overlaps</div>\n            <p>\n                Fix overlap will reschedule appointments that overlap another appointment or an absence\n            </p>\n            <custom-settings-wrapper primitive-type="primitiveType.boolean" label="\'Automatically fix overlaps when an appointment overlaps with another appointment or absence\'" value-field-name="\'Run__c\'" setting="settings.TriggerConfigurations[\'Enable Dynamic Gantt Fix Overlaps\']" is-disabled="hasActiveRecipesOfTypeOverlap" tooltip-text="If you have scheduling recipes of type overlap auto fix overlap will be disabled and turned off"></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.picklist" options="onOverlapDetection" label="\'When attempting to fix overlaps\'" value-field-name="\'Reschedule_Options__c\'" setting="settings.DynamicGanttSettings[\'Dynamic Gantt Overlap Settings\']"></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.picklist" options="onServicesReschedule" label="\'After unscheduling services reschedule them by\'" value-field-name="\'Reschedule_Method__c\'" setting="settings.DynamicGanttSettings[\'Dynamic Gantt Overlap Settings\']"></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.picklist" options="fixOverLapsTreat" label="\'When unable to find a valid schedule for an appointment\'" value-field-name="\'Reschedule_Failure_Treatment__c\'" setting="settings.DynamicGanttSettings[\'Dynamic Gantt Overlap Settings\']"></custom-settings-wrapper>\n   \n            <div class="section-settings" id="__fill-in">Fill-in Schedule</div>\n            <p>\n                Fill-in schedule will schedule work for an idle resource. You can trigger this service from the dispatcher console or through API <br>\n                When trying to fill in an idle resource\'s daily schedule, only service appointments where the folllowing three fields evaluate to true will be considered as candidates. \n            </p>\n            <custom-settings-wrapper primitive-type="primitiveType.picklist" options="saBooleanFields" label="\'Service Appointment candidate Boolean field\'" value-field-name="\'SA_Candidate_Boolean_Field__c\'" setting="settings.DynamicGanttSettings[\'Dynamic Gantt Fill In Settings\']" tooltip-text="Select a Boolean field that indicates if a Service Appointment is a candidate to fill in schedule"></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.picklist" options="woBooleanFields" label="\'Work Order candidate Boolean field\'" value-field-name="\'WO_Candidate_Boolean_Field__c\'" setting="settings.DynamicGanttSettings[\'Dynamic Gantt Fill In Settings\']" tooltip-text="In the case of Work Order as an appointment\'s parent - this field should be true for the service appointment be a candidate."></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.picklist" options="woliBooleanFields" label="\'Work Order Line Item candidate Boolean field\'" value-field-name="\'WOLI_Candidate_Boolean_Field__c\'" setting="settings.DynamicGanttSettings[\'Dynamic Gantt Fill In Settings\']" tooltip-text="In the case of Work Order Line Item as an appointment\'s parent - this field should be true for the service appointment be a candidate."></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.picklist" options="queryOrderBy" label="\'Order candidate appointments by\'" value-field-name="\'Order_Candidate_Appointments_By__c\'" setting="settings.DynamicGanttSettings[\'Dynamic Gantt Fill In Settings\']"></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.number" min="1" max="50" label="\'Max appointments to schedule\'" value-field-name="\'Max_Services_Limit__c\'" setting="settings.DynamicGanttSettings[\'Dynamic Gantt Fill In Settings\']"></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.number" min="5" max="60" label="\'Max runtime (seconds)\'" value-field-name="\'Max_Running_Time__c\'" setting="settings.DynamicGanttSettings[\'Dynamic Gantt Fill In Settings\']"></custom-settings-wrapper>\n           \n            <div class="section-settings" id="__group-near-by">Group Nearby Appointments</div>\n            <p>\n                Group near-by appointments will schedule work that is close to a given appointment together. The service may unassign lower priority appointments in order to make room for the near-by appointments.\n            </p>\n            <custom-settings-wrapper primitive-type="primitiveType.picklist" options="saBooleanFields" label="\'Service Appointment candidate Boolean field\'" value-field-name="\'SA_Candidate_Boolean_Field__c\'" setting="settings.DynamicGanttSettings[\'Dynamic Gantt Group Near By Settings\']" tooltip-text="Select a Boolean field that indicates if a Service Appointment is a candidate to fill in schedule"></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.picklist" options="woBooleanFields" label="\'Work Order candidate Boolean field\'" value-field-name="\'WO_Candidate_Boolean_Field__c\'" setting="settings.DynamicGanttSettings[\'Dynamic Gantt Group Near By Settings\']" tooltip-text="In the case of Work Order as an appointment\'s parent - this field should be true for the service appointment be a candidate."></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.picklist" options="woliBooleanFields" label="\'Work Order Line Item candidate Boolean field\'" value-field-name="\'WOLI_Candidate_Boolean_Field__c\'" setting="settings.DynamicGanttSettings[\'Dynamic Gantt Group Near By Settings\']" tooltip-text="In the case of Work Order Line Item as an appointment\'s parent - this field should be true for the service appointment be a candidate."></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.number" min="1" max="50" label="\'Max appointments to schedule\'" value-field-name="\'Max_Services_Limit__c\'" setting="settings.DynamicGanttSettings[\'Dynamic Gantt Group Near By Settings\']"></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.number" min="5" max="60" label="\'Max runtime (seconds)\'" value-field-name="\'Max_Running_Time__c\'" setting="settings.DynamicGanttSettings[\'Dynamic Gantt Group Near By Settings\']"></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.picklist" options="onReschduleGroupNearBy" label="\'When attempting to schedule the unscheduled service after the nearby services\'" value-field-name="\'Reschedule_Options__c\'" setting="settings.DynamicGanttSettings[\'Dynamic Gantt Group Near By Settings\']"></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.picklist" options="fixOverLapsTreat" label="\'When unable to arrange schedule\'" value-field-name="\'Reschedule_Failure_Treatment__c\'" setting="settings.DynamicGanttSettings[\'Dynamic Gantt Group Near By Settings\']"></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.text" label="\'Radius for nearby appointments\'" value-field-name="\'Max_Services_Radius__c\'" setting="settings.DynamicGanttSettings[\'Dynamic Gantt Group Near By Settings\']" tooltip-text="The radius in which appointments are considered \'near-by\'"></custom-settings-wrapper>\n            \n            <div class="section-settings" id="__reshuffle">Reshuffle assignments</div>\n            <custom-settings-wrapper primitive-type="primitiveType.number" min="1" max="7" label="\'Max time horizon (days) in which the appointment can be scheduled\'" value-field-name="\'Max_Running_Time__c\'" setting="settings.DynamicGanttSettings[\'Dynamic Gantt Reshuffle Settings\']"></custom-settings-wrapper>\n        ';

        return {
            restrict: 'E',
            scope: {
                verifyFunctions: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();

// <custom-settings-wrapper primitive-type="primitiveType.boolean" label="'Try to reshuffle unsuccessful reschedulings'" value-field-name="'Enable_Reshuffle__c'" setting="settings.DynamicGanttSettings['Dynamic Gantt Group Near By Settings']"></custom-settings-wrapper>
// <custom-settings-wrapper primitive-type="primitiveType.picklist" options="onOverlapDetection" label="'When services overlap is detected'" value-field-name="'Reschedule_Options__c'" setting="settings.DynamicGanttSettings['Dynamic Gantt Group Near By Settings']"></custom-settings-wrapper>
'use strict';

(function () {

    angular.module('SettingsApp').directive('schedulingJobs', schedulingJobs);

    schedulingJobs.$inject = [];

    function schedulingJobs() {

        controllerFunction.$inject = ['$scope'];

        function controllerFunction($scope) {

            $scope.verifyFunctions.push(function () {
                return console.log('verify - schedulingJobs');
            });
        }

        var template = '';

        return {
            restrict: 'E',
            scope: {
                verifyFunctions: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('schedulingLogic', schedulingLogic);

    schedulingLogic.$inject = [];

    function schedulingLogic() {

        controllerFunction.$inject = ['$scope', 'primitiveType', 'dataService', 'settingsUtils', 'serviceAppointmentLifeCycleService', '$q', '$rootScope'];

        function controllerFunction($scope, primitiveType, dataService, settingsUtils, serviceAppointmentLifeCycleService, $q, $rootScope) {

            $scope.errors = {};

            // nothing to check here, all good
            $scope.verifyFunctions.push(function () {
                return false;
            });

            $scope.primitiveType = primitiveType;
            $scope.settings = dataService.getDraftSettings();

            $scope.pinnedStatuses = {};

            $scope.startOfWeek = [{ label: 'Sunday', value: 'Sunday' }, { label: 'Monday', value: 'Monday' }];

            $scope.PushTopicProps = ['FSL_Operation__c'];

            $scope.sharingObjectSettingsStatus = 'Validating';

            $scope.sharingObjects = [{
                SharingObjectAPI: "FSL_Operation__Share",
                SharingObjectName: "FSL Operation",
                Status: 'NotUpdated'
            }];

            $scope.buttonStateLabels = {
                update: 'Update push topic',
                updated: 'Push topic updated',
                validate: 'Validating push topic',
                failed: 'Failed to validate Push Topic for complex work'
            };

            $scope.$watch("sharingObjects", function (newValue, oldValue) {
                var privateSettingsCounter = 0;
                for (var i in newValue) {
                    if (newValue[i].Status == 'NotUpdated' || newValue[i].Status == 'ERROR') {
                        return;
                    }

                    if (newValue[i].Status == 'Public') {
                        $scope.sharingObjectSettingsStatus = 'Public';
                        return;
                    }

                    if (newValue[i].Status == 'Private') {
                        privateSettingsCounter++;
                    }
                }

                if (newValue.length == privateSettingsCounter) {
                    $scope.sharingObjectSettingsStatus = 'Private';
                }
            }, true);

            $q.all([serviceAppointmentLifeCycleService.loadData(), dataService.getSettingsPromise()]).then(function () {

                $scope.statuses = serviceAppointmentLifeCycleService.settings.StatusList;

                $scope.statuses.forEach(function (status) {
                    if ($scope.settings.LogicSettings[fieldNames.Logic_Settings__c.Pinned_Statuses_SF__c]) {
                        $scope.pinnedStatuses[status.value] = $scope.settings.LogicSettings[fieldNames.Logic_Settings__c.Pinned_Statuses_SF__c].split(',').indexOf(status.value) > -1;
                    }
                });
            });

            $scope.updateSettings = function () {
                var statuses = [];

                for (var key in $scope.pinnedStatuses) {
                    if ($scope.pinnedStatuses[key]) {
                        statuses.push(key);
                    }
                }

                $scope.settings.LogicSettings[fieldNames.Logic_Settings__c.Pinned_Statuses_SF__c] = statuses.join(',');
                dataService.setDirty();
            };

            $rootScope.$on('settingsUpdated', function () {
                $scope.automators = dataService.getAutomators('Sched009_STMIntegrityChecker');
                // if (dataService.getDraftSettings().LogicSettings[fieldNames.Logic_Settings__c.Use_SLR__c]) {
                //     $scope.automators = $scope.automators.concat(dataService.getAutomators('Sched006_SLRPurge'));
                // }

                $scope.statuses.forEach(function (status) {
                    if ($scope.settings.LogicSettings[fieldNames.Logic_Settings__c.Pinned_Statuses_SF__c]) {
                        $scope.pinnedStatuses[status.value] = $scope.settings.LogicSettings[fieldNames.Logic_Settings__c.Pinned_Statuses_SF__c].split(',').indexOf(status.value) > -1;
                    }
                });
            });

            dataService.getSettingsPromise().then(function () {
                $scope.booleanFields = angular.copy(dataService.serviceBooleanFields);
                $scope.booleanFields.shift();
                $scope.woNumberFields = dataService.woNumberFields;
                $scope.woliNumberFields = dataService.woliNumberFields;
                $scope.saNumberFields = dataService.saNumberFields;
                $scope.automators = dataService.getAutomators('Sched009_STMIntegrityChecker');
                $scope.classNames = ['Sched009_STMIntegrityChecker'];
                $scope.hideIntegrityCheckerAutomator = JSON.parse($scope.settings.GeneralConfig['Hide Integrity Checker Automator'][fieldNames.General_Config__c.Value__c]);

                // if (dataService.getDraftSettings().LogicSettings[fieldNames.Logic_Settings__c.Use_SLR__c])
                // {
                //     $scope.classNames.push('Sched006_SLRPurge');
                //     $scope.automators = $scope.automators.concat(dataService.getAutomators('Sched006_SLRPurge'));
                // }
            });
        }

        var template = '\n            <custom-settings-wrapper primitive-type="primitiveType.picklist" options="booleanFields" label="\'Multiday service appointment field\'" value-field-name="\'MDT_Boolean_Field__c\'" setting="settings.LogicSettings" tooltip-text="The checkbox field that indicates that a service appointment can span multiple days"></custom-settings-wrapper>\n            \n            <custom-settings-wrapper primitive-type="primitiveType.boolean" label="\'Set the hour that starts a new day based on the Availability rule(s)\'" value-field-name="\'Enable_Start_Of_Day__c\'" setting="settings.LogicSettings" tooltip-text="The default, if this is not set, is 12AM"></custom-settings-wrapper>\n            \n            <custom-settings-wrapper primitive-type="primitiveType.number" label="\'Maximum days to get candidates or to book an appointment\'" min="1" max="31" value-field-name="\'Search_slot_max_days__c\'" setting="settings.LogicSettings" tooltip-text="The maximum number of days possible to request an appointment or get candidates. Increasing the maximum decreases performance"></custom-settings-wrapper>\n            \n            <custom-settings-wrapper primitive-type="primitiveType.boolean" label="\'Delay auto-scheduling until appointments are geocoded\'" value-field-name="\'Run__c\'" setting="settings.TriggerConfigurations[\'Wait for clean state\']" tooltip-text="If Auto Schedule is selected on a service appointment, wait to schedule the appointment until its location is geocoded (recommended). This setting doesn\u2019t apply to appointments with no address, which are scheduled without delay. Auto Schedule uses the scheduling policy listed in the appointment\u2019s Scheduling Policy Used field. If none is listed, the default scheduling policy listed in your Appointment Booking settings is used."></custom-settings-wrapper>\n\n            <custom-settings-wrapper primitive-type="primitiveType.boolean" label="\'Activate Approval confirmation on resource absences\'" value-field-name="\'Approved_Absences__c\'" setting="settings.LogicSettings"></custom-settings-wrapper>\n\n            <custom-settings-wrapper primitive-type="primitiveType.boolean" label="\'Enable resource crew skill grouping\'" value-field-name="\'Enable_Crew_Members_Skill_Aggregation__c\'" setting="settings.LogicSettings"></custom-settings-wrapper>\n\n            <custom-settings-wrapper primitive-type="primitiveType.boolean" options="booleanFields" label="\'Avoid aerial calculation upon callout DML exception\'" value-field-name="\'Alert_On_Callout_Failure__c\'" setting="settings.GeocodeSettings"></custom-settings-wrapper>\n\n            <custom-settings-wrapper primitive-type="primitiveType.boolean" label="\'Respect secondary STM operating hours\'" value-field-name="\'Include_Secondary_Calendar__c\'" setting="settings.LogicSettings"></custom-settings-wrapper>\n\n            Select which statuses are considered as pinned, or unmovable, for scheduling<br> \n            \n            <div id="pinned-status-container">\n                <label for="SchedulingPinnedStatus{{$index}}" class="optimizaion-pinned-label truncate" ng-repeat="status in statuses track by $index" title="{{ status.value }}">\n                    <input type="checkbox" id="SchedulingPinnedStatus{{$index}}" ng-model="pinnedStatuses[status.value]" ng-change="updateSettings()" />{{ status.value }}\n                </label>\n            </div>\n\n\n\n\n\n            <div class="section-settings" id="__complex-work">Scheduling Priority</div>\n\n            <custom-settings-wrapper primitive-type="primitiveType.picklist" options="woNumberFields" label="\'Work Order Priority Field\'" value-field-name="\'WO_Priority_Field__c\'" setting="settings.LogicSettings" tooltip-text="Select which field on the appointment\u2019s work order sets the priority."></custom-settings-wrapper>\n            \n            <custom-settings-wrapper primitive-type="primitiveType.picklist" options="woliNumberFields" label="\'Work Order Line Item Priority Field\'" value-field-name="\'WOLI_Priority_Field__c\'" setting="settings.LogicSettings" tooltip-text="Select which field on the appointment\u2019s work order line item sets the priority."></custom-settings-wrapper>\n\n            <custom-settings-wrapper primitive-type="primitiveType.picklist" options="saNumberFields" label="\'Service Appointment Priority Field\'" value-field-name="\'SA_Priority_Field__c\'" setting="settings.LogicSettings" tooltip-text="Select which field on the service appointment sets the priority. If the field is empty, we use the priority field on the parent work order or work order line item."></custom-settings-wrapper>\n\n            <custom-settings-wrapper primitive-type="primitiveType.boolean" label="\'Use 1-100 priority scale\'" value-field-name="\'Use_1_To_100_Priority_Scale__c\'" setting="settings.LogicSettings" tooltip-text="Override the default 1-10 scale for more refined priorities. The 1-100 scale can modify optimization results."></custom-settings-wrapper>\n\n\n\n\n            <automators objects="automators" class-names="classNames" hide-section="hideIntegrityCheckerAutomator"></automators>\n\n            <div class="section-settings" id="__complex-work">Complex Work <a href="https://help.salesforce.com/articleView?id=pfs_complex_work.htm" class="section-link" target="_blank">Learn More</a></div>\n            <div class="alert-warning-banner" ng-show="sharingObjectSettingsStatus == \'Public\'">\n                The object below has public sharing.<br>\n                To enable complex work, set sharing to private for that object.\n            </div>\n\n            <object-sharing-status-directive ng-repeat="sharingObject in sharingObjects" object-sharing-props="sharingObject"></object-sharing-status-directive>\n            <push-topics-creator-directive push-topics-props="PushTopicProps" button-state-labels="buttonStateLabels" push-topics-tool-tip="Complex Work relies on push topic object that query for changes made for the relevant object. The push topic is created with a script upon installation. In some cases, such as when creating a sandbox from an instance with the package installed, the push topic isn\u2019t created. Click Update push topic to create the push topic."></push-topics-creator-directive>\n\n            <custom-settings-wrapper is-disabled="sharingObjectSettingsStatus != \'Private\'" primitive-type="primitiveType.boolean" label="\'Enable complex work\'" value-field-name="\'Use_New_MST_Data_Model__c\'" setting="settings.LogicSettings" tooltip-text="Let users create scheduling dependencies between service appointments. For example, ensure that a particular appointment can\u2019t start until a related appointment is complete."></custom-settings-wrapper>\n            <custom-settings-wrapper is-disabled="sharingObjectSettingsStatus != \'Private\'" primitive-type="primitiveType.boolean" label="\'Use all-or-none scheduling for related appointments\'" value-field-name="\'Fail_On_Schedule__c\'" setting="settings.LogicSettings" tooltip-text="This setting prevents a chain of two service appointments with dependencies between them from being scheduled separately. Related appointments will need to be scheduled in the same scheduling operation. This setting doesn\u2019t apply for chains of three or more appointments."></custom-settings-wrapper>\n                        \n            <div class="section-settings" id="__complex-work">Limit Apex Operations</div>\n            <custom-settings-wrapper primitive-type="primitiveType.boolean" label="\'Set Apex operation timeout limits\'" value-field-name="\'Limit_Apex_Operations__c\'" setting="settings.LogicSettings" tooltip-text="If you\u2019ve encountered CPU timeout errors, select this option to define limits for the following operations. This helps you stay within your org\u2019s Apex CPU timeout limit. For example, enter 90 to end the operation when it reaches 90% of your org\u2019s timeout limit. We recommend experimenting in a sandbox org to find the best values for your org."></custom-settings-wrapper>\n            \n            <custom-settings-wrapper is-text="false" primitive-type="primitiveType.number" min="1" max="100" label="\'Timeout Limit for Get Candidates (Percent)\'" value-field-name="\'Value__c\'" tooltip-text="Limit for the Get Candidates operation, which is used in the Get Candidates Gantt action and the Candidates and Book Appointment Chatter actions." setting="settings.ApexLimits[\'GetCandidatesTotalCpuLimit\']" ></custom-settings-wrapper>\n            <custom-settings-wrapper is-text="false" primitive-type="primitiveType.number" min="1" max="100" label="\'Timeout Limit for Appointment Booking (Percent)\'" value-field-name="\'Value__c\'" tooltip-text="Limit for appointment booking operations, which are used in the Book Appointment Chatter action. The Get Candidates limit counts against this limit." setting="settings.ApexLimits[\'ABTotalCpuLimit\']" ></custom-settings-wrapper>\n            <custom-settings-wrapper is-text="false" primitive-type="primitiveType.number" min="1" max="100" label="\'Timeout Limit for Scheduling (Percent)\'" value-field-name="\'Value__c\'" tooltip-text="Limit for scheduling operations, which are used in the Schedule Gantt action, the Auto Schedule option, and scheduling Chatter actions." setting="settings.ApexLimits[\'ScheduleTotalCpuLimit\']"></custom-settings-wrapper>\n            \n        ';

        return {
            restrict: 'E',
            scope: {
                verifyFunctions: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('schedulingPolicies', schedulingPolicies);

    schedulingPolicies.$inject = [];

    function schedulingPolicies() {

        controllerFunction.$inject = ['$scope', 'schedulingService'];

        function controllerFunction($scope, schedulingService) {

            $scope.verifyFunctions.push(function () {
                return console.log('verify - schedulingPolicies');
            });

            schedulingService.loadData().then(function () {
                $scope.schedulingSettings = schedulingService.settings;
            });
        }

        var template = '\n            <p>\n                A <a target="_blank" ng-href="../{{schedulingSettings.schedulingPoliciesPrefix}}">Scheduling Policy</a> is based on scheduling rules and weighted business objectives.            \n                <br/>\n                When the optimization engine builds and maintains the schedule, its decisions are guided by your scheduling policies.\n            </p>         \n        ';

        return {
            restrict: 'E',
            scope: {
                verifyFunctions: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('schedulingRouting', schedulingRouting);

    schedulingRouting.$inject = [];

    function schedulingRouting() {

        controllerFunction.$inject = ['$scope', 'primitiveType', 'dataService', '$rootScope', '$http', 'settingsUtils', '$timeout', 'OPTIMIZATION_RUNTIME_VALUES'];

        function controllerFunction($scope, primitiveType, dataService, $rootScope, $http, settingsUtils, $timeout, OPTIMIZATION_RUNTIME_VALUES) {

            $scope.sessionId = sessionId;
            $scope.EnableSLRIsDisabled = true;
            $scope.GISRemoteIsInactive = false;
            $scope.ShowRegisterBtn = false;
            $scope.UseSFMapsFMA = UseSFMapsFMA;
            // nothing to check here, all good
            $scope.verifyFunctions.push(function () {
                return false;
            });

            $scope.primitiveType = primitiveType;
            $scope.classNames = [];

            $scope.distanceUnits = [{ label: 'KM', value: 'km' }, { label: 'Mile', value: 'mile' }];

            $scope.speedUnits = [{ label: 'KM/h', value: 'km' }, { label: 'MPH', value: 'mile' }];

            $rootScope.$on('settingsUpdated', function () {
                $scope.lowOptimizationRunTime = $scope.settings.OptimizationSettings[bgoOptimizationSettings][fieldNames.OptimizationSettings__c.Max_Runtime_Single_Service__c] == OPTIMIZATION_RUNTIME_VALUES.LOW;
                $scope.useSLR = $scope.settings.LogicSettings[fieldNames.Logic_Settings__c.Use_SLR__c];
                $scope.usePredictive = $scope.settings.LogicSettings[fieldNames.Logic_Settings__c.Use_Predictive__c];
                $scope.useEdge = true;
                $scope.useSfMaps = $scope.settings.GeocodeSettings[fieldNames.Geocode_Settings__c.Use_SFMaps__c];

                for (var optSetting in $scope.settings.OptimizationSettings) {
                    if ($scope.settings.OptimizationSettings[optSetting][fieldNames.OptimizationSettings__c.Use_Edge__c] == false) {
                        $scope.useEdge = false;
                        break;
                    }
                }
                $scope.useEdge = $scope.useEdge || useEdgeFMA;

                if ($scope.useSLR) {
                    $scope.automators = dataService.getAutomators('Sched006_SLRPurge');
                }
            });

            $scope.onSLRChange = function (val) {

                if (!val) {
                    $scope.usePredictive = false;
                    $scope.settings.LogicSettings[fieldNames.Logic_Settings__c.Use_Predictive__c] = false;
                    $scope.settings.LogicSettings = Object.assign({}, $scope.settings.LogicSettings);
                }

                $scope.useSLR = val;
                $scope.settings.LogicSettings[fieldNames.Logic_Settings__c.Use_SLR__c] = $scope.useSLR;
            };

            $scope.onPredictiveChange = function (val) {

                if (val) {
                    $scope.useSLR = true;
                    $scope.settings.LogicSettings[fieldNames.Logic_Settings__c.Use_SLR__c] = true;
                    $scope.settings.LogicSettings = Object.assign({}, $scope.settings.LogicSettings);
                }

                $scope.usePredictive = val;
                $scope.settings.LogicSettings[fieldNames.Logic_Settings__c.Use_Predictive__c] = $scope.usePredictive;
            };

            $scope.onSalesforceMapsChange = function (val) {
                $scope.useSLR = true;
                $scope.settings.LogicSettings[fieldNames.Logic_Settings__c.Use_SLR__c] = true;
                $scope.usePredictive = $scope.isUpgrade ? true : val;
                $scope.settings.LogicSettings[fieldNames.Logic_Settings__c.Use_Predictive__c] = $scope.usePredictive;

                $scope.settings.LogicSettings = Object.assign({}, $scope.settings.LogicSettings);

                $scope.useSfMaps = val;
            };

            $scope.RegisterSLRBtnDisabled = false;

            $scope.registerSLR = function () {

                $scope.RegisterSLRBtnDisabled = true;
                settingsUtils.callRemoteAction(remoteActions.registerSLR).then(function () {
                    $timeout(function () {
                        alert('Registered!');
                        $scope.RegisterSLRBtnDisabled = false;
                        console.log('Registered SLR');

                        if (!dataService.getDraftSettings().LogicSettings[fieldNames.Logic_Settings__c.Show_Register_Btn__c]) $scope.ShowRegisterBtn = false;
                    }, 2000);
                }).catch(function (err) {
                    alert('Something went  wrong. Please contact our support team if the problem persists.');
                    $scope.RegisterSLRBtnDisabled = false;
                });
            };

            dataService.getSettingsPromise().then(function () {
                $scope.settings = dataService.getDraftSettings();
                $scope.isUpgrade = $scope.settings.GeneralConfig['Is Fresh Install'][fieldNames.General_Config__c.Value__c] === 'upgrade';

                settingsUtils.callRemoteAction(remoteActions.shouldRefreshSLRToken).then(function (result) {
                    $scope.ShowRegisterBtn = $scope.settings.LogicSettings[fieldNames.Logic_Settings__c.Show_Register_Btn__c] || result;
                });

                $scope.useSLR = $scope.settings.LogicSettings[fieldNames.Logic_Settings__c.Use_SLR__c];
                $scope.usePredictive = $scope.settings.LogicSettings[fieldNames.Logic_Settings__c.Use_Predictive__c];
                $scope.useEdge = true;
                $scope.useSfMaps = $scope.settings.GeocodeSettings[fieldNames.Geocode_Settings__c.Use_SFMaps__c];

                for (var optSetting in $scope.settings.OptimizationSettings) {
                    if ($scope.settings.OptimizationSettings[optSetting][fieldNames.OptimizationSettings__c.Use_Edge__c] == false) {
                        $scope.useEdge = false;
                        break;
                    }
                }

                $scope.useEdge = $scope.useEdge || useEdgeFMA;

                $scope.lowOptimizationRunTime = $scope.settings.OptimizationSettings[bgoOptimizationSettings][fieldNames.OptimizationSettings__c.Max_Runtime_Single_Service__c] == OPTIMIZATION_RUNTIME_VALUES.LOW;

                var baseUrl = window.location.origin;

                var dataStr = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:tooling.soap.sforce.com">' + '<soapenv:Header>' + '<urn:SessionHeader>' + '<urn:sessionId>' + $scope.sessionId + '</urn:sessionId>' + '</urn:SessionHeader>' + '</soapenv:Header>' + '<soapenv:Body>' + '<urn:query>' + '<urn:queryString>SELECT id, SiteName, EndpointUrl, isActive FROM RemoteSiteSetting WHERE EndpointUrl = \'https://fsl-gis.cloud.clicksoftware.com\'</urn:queryString>' + '</urn:query>' + '</soapenv:Body>' + '</soapenv:Envelope>';

                $http.post(baseUrl + '/services/Soap/T/38.0', dataStr, { headers: { 'SOAPAction': '""',
                        'Content-Type': 'text/xml',
                        contentType: "text/xml" }
                }).then(function (res) {
                    var parser = new DOMParser();
                    var xmlDoc = parser.parseFromString(res.data, "text/xml");
                    var res = xmlDoc.getElementsByTagName("sf:IsActive");

                    if (res == undefined || res.length == 0 || res[0] == undefined || res[0].innerHTML == "false") {
                        $scope.GISRemoteIsInactive = true;
                        $scope.EnableSLRIsDisabled = true;
                    } else {
                        $scope.GISRemoteIsInactive = false;
                        $scope.EnableSLRIsDisabled = false;
                    }
                }, function (res) {
                    // console.log(res);
                });

                if ($scope.useSLR) {
                    $scope.classNames.push('Sched006_SLRPurge');
                    $scope.automators = dataService.getAutomators('Sched006_SLRPurge');
                }
            });
        }

        var template = '\n            <div class="alert-warning-banner" ng-show="lowOptimizationRunTime && useSLR">\n              When using SLR, it is highly recommended to change the optimization time to Medium or High.<br/>\n              To change the optimization runtime go to Optimization -> Logic<br/>\n            </div>\n\n            <div class="setting-row-container" ng-show="ShowRegisterBtn">\n                <label class="register-button-cls select-label">Register to the Street-Level Routing service</label>\n                <div class="select-container">\n                    <input type="button" ng-disabled="RegisterSLRBtnDisabled" class="register-button slds-button slds-button_brand select-container" ng-click="registerSLR()" value="Register">\n                </div>\n            </div>\n\n            <custom-settings-wrapper change="onSLRChange" is-disabled="useSfMaps || EnableSLRIsDisabled" primitive-type="primitiveType.boolean" label="\'Enable Street Level Routing\'" value-field-name="\'Use_SLR__c\'" setting="settings.LogicSettings" tooltip-text="Enable Street Level Routing to calculate travel distance and time more accurately than the default aerial routing"></custom-settings-wrapper>\n\n            <div ng-show="isUpgrade || !UseSFMapsFMA">                \n                <custom-settings-wrapper change="onPredictiveChange" is-beta="\'Beta\'" is-disabled="useSfMaps|| EnableSLRIsDisabled || !useEdge || !useSLR" primitive-type="primitiveType.boolean" label="\'Enable Predictive Travel for optimization services\'" value-field-name="\'Use_Predictive__c\'" setting="settings.LogicSettings" tooltip-text="{{ !useEdge ? \'Please activate Enhanced Optimization in order to use predictive routing\' : undefined }}"></custom-settings-wrapper>\n            </div>\n            <div class="setting-row-container smallSettingsError" ng-show="GISRemoteIsInactive">Your remote site FSL_GIS is Inactive please activate it before trying to enable SLR.</div>\n\n            <div ng-if="UseSFMapsFMA">\n                <custom-settings-wrapper ng-if="isUpgrade" change="onSalesforceMapsChange" is-beta="\'New\'" primitive-type="primitiveType.boolean" label="\'Enable Point-to-Point Predictive Routing\'" value-field-name="\'Use_SFMaps__c\'" setting="settings.GeocodeSettings" tooltip-text="Point-to-Point Predictive Routing calculates travel distance and time more accurately than aerial routing or street-level routing. After you turn on Point-to-Point Predictive Routing, it replaces Street-Level Routing and Predictive Travel (beta)." learn-link="\'https://help.salesforce.com/articleView?id=pfs_streetlevelrouting.htm&type=5\'"></custom-settings-wrapper>\n                <custom-settings-wrapper ng-if="!isUpgrade" change="onSalesforceMapsChange" is-beta="\'\'" primitive-type="primitiveType.boolean" label="\'Enable Point-to-Point Predictive Routing\'" value-field-name="\'Use_SFMaps__c\'" setting="settings.GeocodeSettings" tooltip-text="Point-to-Point Predictive Routing calculates travel distance and time more accurately than aerial routing or street-level routing. After you turn on Point-to-Point Predictive Routing, it replaces Street-Level Routing." learn-link="\'https://help.salesforce.com/articleView?id=pfs_streetlevelrouting.htm&type=5\'"></custom-settings-wrapper>\n            </div>\n\n            <custom-settings-wrapper primitive-type="primitiveType.boolean" label="\'Calculate travel and breaks\'" value-field-name="\'Run__c\'" setting="settings.TriggerConfigurations[\'Travel Time\']" tooltip-text="Calculates and displays travel time on the Gantt chart and automatically creates breaks according to your Resource Availability work rule."></custom-settings-wrapper>\n\n            <custom-settings-wrapper primitive-type="primitiveType.picklist" options="speedUnits" label="\'Travel speed unit\'" value-field-name="\'Travel_Speed_Unit__c\'" setting="settings.LogicSettings"></custom-settings-wrapper>\n\n            <custom-settings-wrapper primitive-type="primitiveType.number" label="\'Default travel speed\'" min="1" max="1500" value-field-name="\'Travel_Speed__c\'" setting="settings.LogicSettings" tooltip-text="If a different travel speed isn\'t specified on the resource, this value is used to calculate the travel time"></custom-settings-wrapper>\n\n            <div class="section-settings" id="__map">Map</div>\n            <custom-settings-wrapper primitive-type="primitiveType.booleanText" label="\'Show map\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Map available on gantt\']" tooltip-text="Enables map tab"></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.booleanText" label="\'Show street level routing in the Service Resource map tab\'" value-field-name="\'Value__c\'" setting="settings.GeneralConfig[\'Show SLR in resource map\']" tooltip-text="If checked, resource\'s planned travel will be shown on the street level. Otherwise a straight polyline will be shown"></custom-settings-wrapper>\n            \n            <automators objects="automators" class-names="classNames" no-change="useSLR" ng-show="useSLR"></automators>\n        ';

        return {
            restrict: 'E',
            scope: {
                verifyFunctions: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('criteriaEditor', criteriaEditor);

    criteriaEditor.$inject = [];

    function criteriaEditor() {

        controllerFunction.$inject = ['$scope', '$q', 'schedulingRecipesService', 'dataService', 'settingsUtils'];

        function controllerFunction($scope, $q, schedulingRecipesService, dataService, settingsUtils) {

            $scope.criteriaObjectTypeServiceAppointment = schedulingRecipesService.criteriaObjectTypeServiceAppointment();
            $scope.logicTypes = schedulingRecipesService.logicTypes;
            $scope.criteria.Object_Type__c = $scope.objectType;
            $scope.territoriesPickerModalOpen = false;
            $scope.workTypesModalOpen = false;
            $scope.selectedTerritories = {};
            $scope.selectedWorkTypes = {};
            $scope.territories = {};
            $scope.isTerritoriesFiltered = false;
            $scope.isWorkTypesFiltered = false;
            $scope.searchWorkType = '';
            $scope.searchTerritories = '';
            $scope.getTerritoriesMap = function (id) {
                return schedulingRecipesService.territoriesMap()[id];
            };
            $scope.manyTerritories = schedulingRecipesService.manyTerritories;

            $scope.autocompleteTerritoriesOptions = {
                loading: false,
                cachedTerritoriesQueryResults: {},
                addedToSearch: {},
                searchTerritoriesText: null,
                currentResults: [],
                showResults: false,
                noTerritoriesFoundOnSearch: false

            };

            schedulingRecipesService.promises.data().then(function (res) {

                $scope.criteriaObjectTypes = schedulingRecipesService.criteriaObjectTypes();
                $scope.criteriaUserTypes = schedulingRecipesService.criteriaUserTypes();
                $scope.territoriesTree = schedulingRecipesService.territoriesTree();
                $scope.territoriesMap = schedulingRecipesService.territoriesMap();
                $scope.workTypes = schedulingRecipesService.workTypes();

                $scope.parentTerritoryId = fieldNames.ServiceTerritory.ParentTerritoryId;
                $scope.topLevelTerritoryId = fieldNames.ServiceTerritory.TopLevelTerritoryId;

                $scope.criteria.Work_Types__c.map(function (value) {
                    $scope.selectedWorkTypes[value] = true;
                });

                $scope.criteria.Territories__c.map(function (value) {
                    $scope.selectedTerritories[value] = true;
                    $scope.autocompleteTerritoriesOptions.addedToSearch[value] = true;
                });

                $scope.criteriaObjectTypeServiceAppointment = schedulingRecipesService.criteriaObjectTypeServiceAppointment();

                if ($scope.objectType === $scope.criteriaObjectTypeServiceAppointment) {
                    $scope.serviceFields = schedulingRecipesService.serviceFieldsDescribe();
                    $scope.statusCategories = $scope.serviceFields[fieldNames.ServiceAppointment.StatusCategory].picklistValues;
                    $scope.serviceFields[schedulingRecipesService.parentFieldDescribe.name] = schedulingRecipesService.parentFieldDescribe;
                }

                // When we will support Resource Absence object we will configure the resource absence fields.
            });

            $scope.parseSelectedWorkTypes = function () {
                if (!$scope.criteria.Work_Types__c || $scope.criteria.Work_Types__c.length === 0) {
                    return 'All';
                }

                var selectedWorkTypesStr = '';

                if (!!$scope.workTypes) {
                    $scope.criteria.Work_Types__c.map(function (value, index) {
                        if ($scope.criteria.Work_Types__c.length === index + 1) {
                            selectedWorkTypesStr += $scope.workTypes[value].Name + '.';
                        } else {
                            selectedWorkTypesStr += $scope.workTypes[value].Name + ', ';
                        }
                    });
                }

                return selectedWorkTypesStr;
            };

            $scope.parseSelectedTerritories = function () {

                if (!$scope.criteria.Territories__c || $scope.criteria.Territories__c.length === 0) {
                    return 'All';
                }

                var selectedTerritoriesStr = '';

                if (!!$scope.territoriesMap) {
                    $scope.criteria.Territories__c.map(function (value, index) {
                        if ($scope.criteria.Territories__c.length === index + 1) {
                            selectedTerritoriesStr += $scope.territoriesMap[value].Name + '.';
                        } else {
                            selectedTerritoriesStr += $scope.territoriesMap[value].Name + ', ';
                        }
                    });
                }

                return selectedTerritoriesStr;
            };

            $scope.saveTerritories = function () {

                if (!$scope.manyTerritories()) {
                    $scope.criteria.Territories__c = Object.keys($scope.selectedTerritories);
                } else {

                    $scope.criteria.Territories__c = [];

                    for (var id in $scope.selectedTerritories) {
                        $scope.selectedTerritories[id] && $scope.criteria.Territories__c.push(id);
                    }
                }
            };

            $scope.restoreSelectedTerritories = function () {
                $scope.selectedTerritories = {};

                $scope.criteria.Territories__c.map(function (value) {
                    $scope.selectedTerritories[value] = true;
                });
            };

            $scope.saveWorkTypes = function () {
                $scope.criteria.Work_Types__c = Object.keys($scope.selectedWorkTypes);
            };

            $scope.restoreWorkTypes = function () {
                $scope.selectedWorkTypes = {};

                $scope.criteria.Work_Types__c.map(function (value) {
                    $scope.selectedWorkTypes[value] = true;
                });
            };

            $scope.$watch('criteria', function (newVal) {
                $scope.restoreSelectedTerritories();
                $scope.restoreWorkTypes();
            });

            $scope.filterTerritories = function (value) {
                if (!!value && value.length > 1) {
                    $scope.isTerritoriesFiltered = true;

                    if (!!$scope.territoriesTree) {
                        for (var i = 0; i < $scope.territoriesTree.length; i++) {
                            $scope.visit($scope.territoriesTree[i], value.toLowerCase());
                        }
                    }
                } else {
                    $scope.isTerritoriesFiltered = false;
                }
            };

            $scope.filterWorkTypes = function (value) {
                if (!!value && value.length > 1) {
                    $scope.isWorkTypesFiltered = true;

                    if (!!$scope.workTypes) {
                        for (var id in $scope.workTypes) {
                            $scope.visit($scope.workTypes[id], value.toLowerCase());
                        }
                    }
                } else {
                    $scope.isWorkTypesFiltered = false;
                }
            };

            $scope.visit = function (node, searchTerm) {

                node.filter = true;

                var foundMatch = false;

                if (!!node.children && node.children.length > 0) {
                    for (var i = 0; i < node.children.length; i++) {
                        foundMatch = $scope.visit(node.children[i], searchTerm) || foundMatch;
                    }
                }

                var searchTermFound = node.Name.toLowerCase().indexOf(searchTerm) > -1;
                node.filter = foundMatch || searchTermFound;
                node.isOpen = node.filter;
                return node.filter;
            };

            $scope.searchTerritoriesOnServer = function (searchText) {

                // search is empty, mark "none" and validate
                if (searchText === "" || !searchText) {

                    $scope.autocompleteTerritoriesOptions.currentResults.forEach(function (territory) {

                        if ($scope.selectedTerritories[territory.Id]) {
                            $scope.autocompleteTerritoriesOptions.addedToSearch[territory.Id] = true;
                        }
                    });

                    $scope.autocompleteTerritoriesOptions.currentResults = [];
                    $scope.autocompleteTerritoriesOptions.showResults = false;
                    $scope.autocompleteTerritoriesOptions.noTerritoriesFoundOnSearch = false;

                    return;
                }

                // check if cached
                if ($scope.autocompleteTerritoriesOptions.cachedTerritoriesQueryResults[searchText.toLocaleLowerCase()]) {

                    $scope.autocompleteTerritoriesOptions.currentResults = $scope.autocompleteTerritoriesOptions.cachedTerritoriesQueryResults[searchText.toLocaleLowerCase()];
                    $scope.autocompleteTerritoriesOptions.showResults = true;
                    $scope.autocompleteTerritoriesOptions.noTerritoriesFoundOnSearch = $scope.autocompleteTerritoriesOptions.currentResults.length === 0;

                    return;
                }

                $scope.autocompleteTerritoriesOptions.loading = true;

                // query from server
                window.Visualforce.remoting.Manager.invokeAction(window.remoteActions.searchTerritories, searchText, function (result, ev) {

                    if (ev.status) {

                        var recipesTerritories = schedulingRecipesService.territoriesMap();

                        result.forEach(function (t) {
                            recipesTerritories[t.Id] = t;
                        });

                        settingsUtils.safeApply($scope, function () {

                            // cache
                            $scope.autocompleteTerritoriesOptions.cachedTerritoriesQueryResults[searchText.toLocaleLowerCase()] = result;
                            $scope.autocompleteTerritoriesOptions.showResults = true;
                            $scope.autocompleteTerritoriesOptions.loading = false;
                            $scope.autocompleteTerritoriesOptions.currentResults = result;

                            if (result.length === 0) {
                                $scope.autocompleteTerritoriesOptions.noTerritoriesFoundOnSearch = true;
                            } else {

                                $scope.autocompleteTerritoriesOptions.noTerritoriesFoundOnSearch = false;
                            }
                        });
                    } else {

                        console.warn(ev);
                    }
                }, { buffer: true, escape: false, timeout: 120000 });
            };

            $scope.selectTerritories = function (all) {

                if ($scope.autocompleteTerritoriesOptions.showResults) {

                    $scope.autocompleteTerritoriesOptions.currentResults.forEach(function (territory) {
                        $scope.selectedTerritories[territory.Id] = all;
                    });
                } else {

                    for (var k in $scope.autocompleteTerritoriesOptions.addedToSearch) {
                        $scope.selectedTerritories[k] = all;
                    }
                }
            };

            $scope.addToAddedTerritories = function (id, value) {

                if (value) {
                    $scope.autocompleteTerritoriesOptions.addedToSearch[id] = value;
                } else {
                    delete $scope.autocompleteTerritoriesOptions.addedToSearch[id];
                }
            };
        }

        var template = '<div ng-if="criteria">\n                            <div>Run this recipe only for service appointments that meet the following criteria. Optionally, add custom criteria to further limit which appointments the recipe applies to.</div> \n                            <div class="slds-m-bottom_x-small slds-m-top_medium slds-m-left_large">\n                                <div class="slds-form-element slds-m-vertical_x-small">\n                                    <label class="slds-form-element__label select-label">Service Territories</label>\n                                    <label class="select-label truncate criteria-weak-text" title="{{ parseSelectedTerritories() }}">\n                                        {{ parseSelectedTerritories() }}\n                                    </label>\n                                    <div class="select-container">\n                                        <div class="slds-button slds-button_outline-brand criteria-action-btn" ng-click="territoriesPickerModalOpen = !territoriesPickerModalOpen">\n                                            Select Territories\n                                        </div>\n                                    </div>\n                                </div>\n                                <div class="slds-form-element slds-m-vertical_x-small">\n                                    <label class="slds-form-element__label select-label">Work Types</label>\n                                    <label class="select-label truncate criteria-weak-text" title="{{ parseSelectedWorkTypes() }}">\n                                        {{ parseSelectedWorkTypes() }}\n                                    </label>\n                                    <div class="select-container">\n                                        <div class="slds-button slds-button_outline-brand criteria-action-btn" ng-click="workTypesModalOpen = !workTypesModalOpen">Select Work Types</div>\n                                    </div>\n                                </div>\n                                \n                                <div style="width: 40%">\n                                    <picklist-setting-lightning title="Status Categories" tooltip-top="-8.5rem" tooltip-left="-1.1rem" tooltip="{{ isLengthenedShortened ? \'Run recipe only for appointments whose status falls into a selected status category. Excluding the Canceled status category, the appointment\u2019s status must also be a pinned status, set in Field Service Settings | Optimization | Logic.\' : undefined}}" object="criteria.Criteria_Items__c.mandatory" value-field="statusCategory" option-value-field="value" option-label-field="label" options="statusCategories" is-multi-select="true" is-disabled="forceStatusCategory" is-required="showRequired"></picklist-setting-lightning>\n                                    <picklist-setting-lightning title="Initiating User Permission Set" tooltip-top="-5.1rem" tooltip-left="-1.1rem" tooltip="Select the types of users who can trigger this recipe. The options correspond to the user\u2019s field service permission sets." object="criteria" value-field="User_Type__c" option-value-field="value" option-label-field="label" options="criteriaUserTypes" is-multi-select="true" is-required="showRequired"></picklist-setting-lightning>                                    \n                                </div>\n                                <expression-editor logic-expression="criteria.Logic__c.custom" criteria-items="criteria.Criteria_Items__c.custom" label="Custom Criteria Logic" fields="serviceFields" ng-if="serviceFields" show-required="showRequired"></expression-editor>\n                            </div>\n                            \n                            <lightning-modal header-text="Select Work Types" show="workTypesModalOpen" with-footer="true" on-save="saveWorkTypes" on-close-cancel="restoreWorkTypes" fixed-modal-height="true" cancel-text="Cancel" save-text="Save">\n                                <div class="slds-form-element slds-m-horizontal--medium slds-m-bottom--medium">\n                                    <div class="slds-form-element__control slds-input-has-icon slds-input-has-icon_left-right">\n                                        <svg class="slds-icon slds-input__icon slds-input__icon_left slds-icon-text-default" aria-hidden="true">\n                                            <use xlink:href="' + settings.icons.search + '" />\n                                        </svg>\n                                        <input type="text" class="slds-input slds-combobox__input" id="combobox-unique-id-2" aria-autocomplete="list" aria-controls="listbox-unique-id" autocomplete="off" role="textbox" type="text" placeholder="Search work types..." ng-model="searchWorkType" ng-change="filterWorkTypes(searchWorkType)" ng-model-options="{ debounce: 200 }"/>\n                                        <button class="slds-button slds-button_icon slds-input__icon slds-input__icon_right" title="Clear" ng-show="searchWorkType.length > 0" ng-click="searchWorkType = \'\';filterWorkTypes(\'\')">\n                                            <svg class="slds-button__icon slds-icon-text-light" aria-hidden="true">\n                                                <use xlink:href="' + settings.icons.close + '" />\n                                            </svg>\n                                            <span class="slds-assistive-text">Clear</span>\n                                        </button>\n                                    </div>\n                                    <div class="slds-m-top--medium">\n                                        Select one or more work types. Your scheduling recipe can run only for service appointments associated with the selected work types.\n                                    </div>\n                                </div>\n                                <collection collection="workTypes" label="\'Name\'" selected="selectedWorkTypes" filter-on="isWorkTypesFiltered"></collection>\n                            </lightning-modal>\n                            \n                            \n                            \n                            <!---------------- TERRITORIES TREE ---------------->\n                            \n                            \n                            <lightning-modal header-text="Select Service Territories" ng-show="!$parent.manyTerritories()" show="territoriesPickerModalOpen" with-footer="true" on-save="saveTerritories" on-close-cancel="restoreSelectedTerritories" fixed-modal-height="true" cancel-text="Cancel" save-text="Save">\n                                <div class="slds-form-element slds-m-horizontal--medium slds-m-bottom--medium">\n                                \n                                    <div class="slds-form-element__control slds-input-has-icon slds-input-has-icon_left-right">\n                                        <svg class="slds-icon slds-input__icon slds-input__icon_left slds-icon-text-default" aria-hidden="true">\n                                            <use xlink:href="' + settings.icons.search + '" />\n                                        </svg>\n                                        <input type="text" class="slds-input slds-combobox__input" id="combobox-unique-id-2" aria-autocomplete="list" aria-controls="listbox-unique-id" autocomplete="off" role="textbox" type="text" placeholder="Search service territories..." ng-model="searchTerritories" ng-change="filterTerritories(searchTerritories)" ng-model-options="{ debounce: 200 }"/>\n                                        <button class="slds-button slds-button_icon slds-input__icon slds-input__icon_right" ng-show="searchTerritories.length > 0" title="Clear" ng-click="searchTerritories = \'\';filterTerritories(\'\')">\n                                            <svg class="slds-button__icon slds-icon-text-light" aria-hidden="true">\n                                                <use xlink:href="' + settings.icons.close + '" />\n                                            </svg>\n                                            <span class="slds-assistive-text">Clear</span>\n                                        </button>\n                                    </div>\n                                    \n                                    <div class="slds-m-top--medium">\n                                        Select one or more service territories. Your scheduling recipe can run only for service appointments located within the selected territories.\n                                    </div>\n                                    \n                                </div>\n                                <collection filter-on="isTerritoriesFiltered" collection="territoriesTree" label="\'Name\'" selected="selectedTerritories" top-level-id="topLevelTerritoryId" parent-id="parentTerritoryId"></collection>\n                            </lightning-modal>\n                            \n                            \n                            \n                            \n                            \n                            <!---------------- AUTO COMPLETE FOR TERRITORIES ---------------->\n                             \n                            <lightning-modal header-text="Select Service Territories" ng-show="$parent.manyTerritories()" show="territoriesPickerModalOpen" with-footer="true" on-save="saveTerritories" on-close-cancel="restoreSelectedTerritories" fixed-modal-height="true" cancel-text="Cancel" save-text="Save">\n                                <div class="slds-form-element slds-m-horizontal--medium slds-m-bottom--medium">\n                                \n                                    <div class="slds-form-element__control slds-input-has-icon slds-input-has-icon_left-right">\n                                        <svg class="slds-icon slds-input__icon slds-input__icon_left slds-icon-text-default" aria-hidden="true">\n                                            <use xlink:href="' + settings.icons.search + '" />\n                                        </svg>\n                                       \n                                        <input style="width: calc(100% - 180px);" type="text" class="slds-input slds-combobox__input" id="combobox-unique-id-2" aria-autocomplete="list" aria-controls="listbox-unique-id" autocomplete="off" role="textbox" type="text" placeholder="Search service territories..." ng-model="autocompleteTerritoriesOptions.searchTerritoriesText" ng-change="searchTerritoriesOnServer(autocompleteTerritoriesOptions.searchTerritoriesText)" ng-click="searchTerritoriesOnServer(autocompleteTerritoriesOptions.searchTerritoriesText)" ng-model-options="{ debounce: 333 }"/>\n                                        \n                                        <button style="right: initial; margin-left: -26px;" class="slds-button slds-button_icon slds-input__icon slds-input__icon_right" ng-show="autocompleteTerritoriesOptions.searchTerritoriesText" title="Clear" ng-click="autocompleteTerritoriesOptions.searchTerritoriesText = \'\'; filterTerritories(\'\'); autocompleteTerritoriesOptions.showResults = false">\n                                            <svg class="slds-button__icon slds-icon-text-light" aria-hidden="true">\n                                                <use xlink:href="' + settings.icons.close + '" />\n                                            </svg>\n                                            <span class="slds-assistive-text">Clear</span>\n                                        </button>\n                                        \n                                        <div class="select-all-territories-btn" ng-click="selectTerritories(true)">Select All</div>\n                                        <div class="select-all-territories-btn" ng-click="selectTerritories(false)">Select None</div>\n                                        \n                                    </div>\n                                    \n                                    <div class="slds-m-top--medium" style="margin-top: 10px"> \n                                        Select one or more service territories. Your scheduling recipe can run only for service appointments located within the selected territories.\n                                    </div>\n                                    \n                                </div>\n                                \n                                <div>\n                                    \n                                    <div ng-repeat="(id,value) in autocompleteTerritoriesOptions.addedToSearch" ng-show="!autocompleteTerritoriesOptions.showResults">\n                                    \n                                        <div class="slds-checkbox">\n                                            <label class="slds-checkbox__label">\n                                                <input id="ter_crit_{{id}}" type="checkbox" ng-model="selectedTerritories[id]"/>\n                                                <span class="slds-checkbox_faux"></span>\n                                            </label>\n                                        </div> \n                                        <label class="slds-m-left--x-small" for="ter_crit_{{id}}">{{getTerritoriesMap(id).Name}}</label>\n                                    \n                                    </div>\n                                    \n                                    \n                                    <div ng-repeat="ter in autocompleteTerritoriesOptions.currentResults" ng-show="autocompleteTerritoriesOptions.showResults && autocompleteTerritoriesOptions.currentResults.length > 0 && !autocompleteTerritoriesOptions.loading">\n                                    \n                                        <div class="slds-checkbox">\n                                            <label class="slds-checkbox__label">\n                                                <input id="ter_crit_{{ter.Id}}" type="checkbox" ng-model="selectedTerritories[ter.Id]" ng-change="addToAddedTerritories(ter.Id, selectedTerritories[ter.Id])"/>\n                                                <span class="slds-checkbox_faux"></span>\n                                            </label>\n                                        </div> \n                                        <label class="slds-m-left--x-small" for="ter_crit_{{ter.Id}}">{{ter.Name}}</label>\n                                    \n                                    </div>\n                                    \n                                    \n                                    \n                                    <div id="RecipesNoTerritoryFound" ng-show="autocompleteTerritoriesOptions.currentResults.length == 0 && autocompleteTerritoriesOptions.searchTerritoriesText && autocompleteTerritoriesOptions.noTerritoriesFoundOnSearch">\n                                        No Service Territories were found\n                                    </div>\n                                    \n                                    \n                                    <img class="loading-recipies-ter" ng-show="autocompleteTerritoriesOptions.loading" src="' + window.settings.icons.spinner + '" />\n                                    \n                                    \n                                    \n                                    \n                                    \n                                </div>\n                                \n                            </lightning-modal>\n                                \n                        </div>';

        return {
            restrict: 'E',
            scope: {
                criteria: '=',
                objectType: '=',
                forceStatusCategory: '=',
                showRequired: '=',
                isLengthenedShortened: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('customCriteriaItem', customCriteriaItem);

    customCriteriaItem.$inject = [];

    function customCriteriaItem() {

        controllerFunction.$inject = ['$scope', '$q', 'schedulingRecipesService', 'dataService'];

        function controllerFunction($scope, $q, schedulingRecipesService, dataService) {

            $scope.displayDate = undefined;
            $scope.picklistOptions = [];
            $scope.fieldTypes = schedulingRecipesService.fieldTypes;
            $scope.booleanOptions = [{ label: 'True', value: true }, { label: 'False', value: false }];

            $scope.deleteCriteriaItem = function () {
                if ($scope.onDelete()) {
                    $scope.onDelete()($scope.criteriaItem);
                }
            };

            $scope.filterOperatorsByFieldType = function () {

                var filteredOperators = {};
                var operators = schedulingRecipesService.operators;

                if ($scope.fieldType) {
                    Object.keys(operators).map(function (key) {
                        if (operators[key].availability.indexOf($scope.fieldType) > -1) {
                            filteredOperators[key] = operators[key];
                        }
                    });
                }

                $scope.operators = filteredOperators;
            };

            $scope.getFormattedDate = function () {

                if (!$scope.criteriaItem.value) {
                    return 'Select a date...';
                }

                var momentTime = moment($scope.criteriaItem.value);
                var res = void 0;

                if ($scope.fieldType === $scope.fieldTypes.DATETIME) {
                    res = momentTime.format('l LT');
                    return res;
                } else {
                    res = momentTime.format('L');
                    return res;
                }
            };

            $scope.parseChanges = function () {
                if ($scope.fields && $scope.criteriaItem.field && $scope.fields[$scope.criteriaItem.field]) {
                    $scope.fieldType = $scope.fields[$scope.criteriaItem.field].fieldType;
                    $scope.filterOperatorsByFieldType();

                    if ($scope.fieldType === $scope.fieldTypes.PICKLIST) {
                        $scope.picklistOptions = $scope.fields[$scope.criteriaItem.field].picklistValues;
                    }

                    if ($scope.fieldType === $scope.fieldTypes.DATETIME || $scope.fieldType === $scope.fieldTypes.DATE) {
                        $scope.displayDate = $scope.getFormattedDate();
                    }
                }
            };

            $scope.onFieldChange = function (field) {

                if ($scope.fields && $scope.criteriaItem.field && $scope.fields[$scope.criteriaItem.field]) {
                    if ($scope.fieldType !== $scope.fields[$scope.criteriaItem.field]) {
                        $scope.criteriaItem.value = undefined;
                    }
                }

                $scope.parseChanges();
            };

            $scope.onDatePickerClick = function () {

                if ($scope.fieldType === $scope.fieldTypes.DATETIME || $scope.fieldType === $scope.fieldTypes.DATE) {

                    if (!$scope.dhtmlxCalendar) {

                        $scope.dhtmlxCalendar = new window.dhtmlXCalendarObject('date-input-id-value-' + $scope.criteriaItem.index);
                        $scope.attachDhtmlxEvents();

                        if ($scope.fieldType === $scope.fieldTypes.DATE) {
                            $scope.dhtmlxCalendar.hideTime();
                        }
                    } else {

                        if ($scope.fieldType === $scope.fieldTypes.DATE) {
                            $scope.dhtmlxCalendar.hideTime();
                        } else {
                            $scope.dhtmlxCalendar.showTime();
                        }
                    }
                } else {
                    $scope.detachDhtmlxEvents();
                }
            };

            $scope.attachDhtmlxEvents = function () {

                $scope.onChangeEventId = $scope.dhtmlxCalendar.attachEvent("onChange", function (date, state) {
                    $scope.criteriaItem.value = date.getTime();
                    $scope.displayDate = $scope.getFormattedDate();
                    $scope.$digest();
                });

                $scope.onShowEventId = $scope.dhtmlxCalendar.attachEvent("onShow", function () {

                    if (!!$scope.criteriaItem.value) {

                        var parseDate = new Date($scope.criteriaItem.value);

                        if (parseDate.toString() === 'Invalid Date') {
                            $scope.dhtmlxCalendar.setDate(new Date());
                        } else {
                            $scope.dhtmlxCalendar.setDate(parseDate);
                        }
                    } else {
                        $scope.dhtmlxCalendar.setDate(new Date());
                    }
                });
            };

            $scope.detachDhtmlxEvents = function () {

                if (!!$scope.dhtmlxCalendar) {

                    if ($scope.onChangeEventId) {
                        $scope.dhtmlxCalendar.detachEvent($scope.onChangeEventId);
                    }

                    if ($scope.onShowEventId) {
                        $scope.dhtmlxCalendar.detachEvent($scope.onShowEventId);
                    }

                    $scope.dhtmlxCalendar = undefined;
                }
            };

            $scope.isTextField = function () {
                return $scope.fieldType === $scope.fieldTypes.EMAIL || $scope.fieldType === $scope.fieldTypes.ID || $scope.fieldType === $scope.fieldTypes.REFERENCE || $scope.fieldType === $scope.fieldTypes.STRING || $scope.fieldType === $scope.fieldTypes.TEXTAREA || $scope.fieldType === $scope.fieldTypes.PHONE || $scope.fieldType === undefined;
            };

            $scope.isNumberField = function () {
                return $scope.fieldType === $scope.fieldTypes.CURRENCY || $scope.fieldType === $scope.fieldTypes.PERCENT || $scope.fieldType === $scope.fieldTypes.INTEGER || $scope.fieldType === $scope.fieldTypes.DOUBLE;
            };

            $scope.$watch('fields', function (newVal) {
                $scope.parseChanges();
            });

            $scope.$watch('criteriaItem', function (newVal) {
                $scope.parseChanges();
            });

            $scope.$on('$destroy', function () {
                $scope.detachDhtmlxEvents();
            });
        }

        var template = '<li class="slds-expression__row">\n                            <fieldset>\n                                <legend class="slds-expression__legend" ng-style="criteriaItem.index !== 1 ? { \'padding-top\' : \'0\' } : {}" ng-if="indexed" style="width: 2rem">\n                                    <span>{{criteriaItem.index}}</span> \n                                </legend>\n                                <div class="slds-grid slds-gutters_xx-small">\n                                    <div class="slds-col">\n                                        <div class="slds-form-element">\n                                            <label class="slds-form-element__label" for="combobox-id-field" ng-if="criteriaItem.index === 1">Service Appointment Field</label>\n                                            <picklist-setting-lightning object="criteriaItem" value-field="field" option-value-field="name" option-label-field="label" options="fields" change="onFieldChange" is-required="showRequired"></picklist-setting-lightning>\n                                        </div>\n                                    </div>\n                                    <div class="slds-col slds-grow-none">\n                                        <div class="slds-form-element">\n                                            <label class="slds-form-element__label" for="combobox-id-operator" ng-if="criteriaItem.index === 1">Operator</label>\n                                            <picklist-setting-lightning object="criteriaItem" value-field="operator" option-value-field="label" option-label-field="label" options="operators" is-required="showRequired && !!criteriaItem.field"></picklist-setting-lightning>\n                                        </div>\n                                    </div>\n                                    <div class="slds-col">\n                                        <div class="slds-form-element" ng-class="{\'slds-has-error\': showRequired && criteriaItem.value == undefined && !!criteriaItem.operator}">\n                                            <label class="slds-form-element__label" for="text-input-id-value" ng-if="criteriaItem.index === 1">Value</label>\n                                            <div class="slds-form-element__control">\n                                                <picklist-setting-lightning object="criteriaItem" value-field="value" option-value-field="value" option-label-field="label" options="booleanOptions" ng-if="fieldType == fieldTypes.BOOLEAN" is-disabled="!criteriaItem.operator" is-required="showRequired"></picklist-setting-lightning>\n                                                <picklist-setting-lightning object="criteriaItem" value-field="value" option-value-field="value" option-label-field="label" options="picklistOptions" ng-if="fieldType == fieldTypes.PICKLIST" is-multi-select="true" is-disabled="!criteriaItem.operator" is-required="showRequired"></picklist-setting-lightning>\n                                                <input type="text" id="{{\'date-input-id-value-\' + criteriaItem.index}}" class="slds-input" ng-model="displayDate" ng-if="fieldType == fieldTypes.DATE || fieldType == fieldTypes.DATETIME" ng-click="onDatePickerClick()" ng-disabled="!criteriaItem.operator"/>\n                                                <input type="number" id="number-input-id-value" class="slds-input input-standard-size" ng-model="criteriaItem.value" ng-if="isNumberField()" ng-disabled="!criteriaItem.operator"/>\n                                                <input type="text" id="number-input-id-value" class="slds-input input-standard-size" ng-model="criteriaItem.value" ng-show="isTextField()" ng-disabled="!criteriaItem.operator"/>\n                                                <div class="slds-form-element__help" id="error-message-unique-id" ng-if="criteriaItem.value == undefined && showRequired && !!criteriaItem.operator && (fieldType == fieldTypes.DATE || fieldType == fieldTypes.DATETIME || isNumberField() || isTextField())">This field is required</div>\n                                            </div>\n                                        </div>\n                                    </div>\n                                    <div class="slds-col slds-grow-none" style="align-self: flex-start">\n                                        <div class="slds-form-element">\n                                            <span class="slds-form-element__label" ng-if="criteriaItem.index === 1">&nbsp;</span>\n                                            <div class="slds-form-element__control">\n                                                <button class="slds-button slds-button_icon slds-button_icon-border-filled" title="Delete Condition" ng-click="deleteCriteriaItem()">\n                                                    <svg class="slds-button__icon" aria-hidden="true">\n                                                        <use xlink:href="' + settings.icons.delete + '"></use>\n                                                    </svg>\n                                                </button>\n                                            </div>\n                                        </div>\n                                    </div>\n                                </div>\n                            </fieldset>\n                        </li>';

        return {
            restrict: 'E',
            scope: {
                criteriaItem: '=',
                fields: '=',
                onDelete: '&',
                indexed: '=',
                showRequired: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('expressionEditor', expressionEditor);

    expressionEditor.$inject = [];

    function expressionEditor() {

        controllerFunction.$inject = ['$scope', '$q', 'schedulingRecipesService'];

        function controllerFunction($scope, $q, schedulingRecipesService) {

            $scope.logicTypes = schedulingRecipesService.logicTypes;
            $scope.showCustomLogicError = false;
            $scope.maxCriteriaItemsReached = false;

            $scope.addNewCondition = function () {
                if ($scope.criteriaItems.length <= 9) {
                    $scope.criteriaItems.push(new CriteriaItem($scope.criteriaItems.length + 1, null, null, null));
                } else {
                    $scope.maxCriteriaItemsReached = true;
                }
            };

            $scope.deleteCondition = function (criteriaItem) {

                var criteriaIndex = $scope.criteriaItems.indexOf(criteriaItem);

                $scope.criteriaItems.splice(criteriaIndex, 1);

                for (var idx = 0; idx < $scope.criteriaItems.length; idx++) {
                    $scope.criteriaItems[idx].index = idx + 1;
                }

                $scope.maxCriteriaItemsReached = false;
            };

            $scope.$watch('showRequired', function (newVal, oldVal) {
                if (!newVal) {
                    $scope.showCustomLogicError = false;
                } else {
                    $scope.showCustomLogicError = schedulingRecipesService.isCustomLogicExpressionIsInvalid($scope.logicExpression, $scope.criteriaItems);
                }
            });
        }

        var template = '<div class="slds-expression slds-m-vertical_x-small">\n                            <div class="slds-expression__options">\n                                <picklist-setting-lightning title="{{label}}" object="logicExpression" value-field="type" option-value-field="value" option-label-field="label" options="logicTypes" is-required="showRequired && showCustomLogicError && criteriaItems.length > 0" is-disabled="!criteriaItems || criteriaItems.length < 1"></picklist-setting-lightning>\n                            </div>\n                            <ul>\n                                <custom-criteria-item ng-repeat="criteriaItem in criteriaItems" criteria-item="criteriaItem" fields="fields" on-delete="deleteCondition" indexed="logicExpression.type && logicTypes[logicExpression.type].value === logicTypes.custom.value" show-required="showRequired"></custom-criteria-item>\n                            </ul>\n                            <div class="slds-expression__buttons">\n                                <button class="slds-button slds-button_neutral" ng-click="addNewCondition()" ng-hide="maxCriteriaItemsReached">\n                                    <svg class="slds-button__icon slds-button__icon_left" aria-hidden="true">\n                                        <use xlink:href="' + settings.icons.add + '"></use>\n                                    </svg>\n                                    Add\n                                </button>\n                                <div ng-show="maxCriteriaItemsReached" style="font-weight: bold;"> \n                                    Max number of conditions is 10. \n                                </div>\n                            </div>\n                            <div class="slds-expression__custom-logic" ng-if="logicExpression.type && logicTypes[logicExpression.type].value === logicTypes.custom.value">\n                                <div class="slds-form-element" ng-class="{\'slds-has-error\': showRequired && showCustomLogicError}">\n                                    <abbr class="slds-required" title="required" ng-if="showRequired && showCustomLogicError">* </abbr>\n                                    <label class="slds-form-element__label" for="text-input-id-custom-logic">Custom Logic</label>\n                                    <div class="slds-form-element__control">\n                                        <input type="text" required="" id="text-input-id-custom-logic" aria-describedby="error-message-unique-id" class="slds-input" ng-model="logicExpression.logic" placeholder="e.g. 1 AND 2 OR 3."/>\n                                    </div>\n                                    <div class="slds-form-element__help" id="error-message-unique-id" ng-if="showRequired && showCustomLogicError">This field is invalid</div>\n                                </div>\n                            </div>\n                        </div>';

        return {
            restrict: 'E',
            scope: {
                logicExpression: '=',
                criteriaItems: '=',
                label: '@',
                fields: '=',
                showRequired: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('schedulingRecipes', schedulingRecipes);

    schedulingRecipes.$inject = [];

    function schedulingRecipes() {

        controllerFunction.$inject = ['$rootScope', '$scope', 'schedulingRecipesService', 'dataService', '$timeout'];

        function controllerFunction($rootScope, $scope, schedulingRecipesService, dataService, $timeout) {

            $scope.showModal = false;

            $scope.onSaveModal = function () {
                $scope.$parent.$parent.$parent.settings.switchPageAndTab({}, settings.menu[5], settings.menu[5].items[0], 5, 0);

                $timeout(function () {
                    $scope.showModal = true;
                }, 0);
            };

            $scope.goBack = function () {
                $scope.$parent.$parent.$parent.settings.switchPageAndTab({}, settings.menu[0], settings.menu[0].items[0], 0, 0);
                $timeout(function () {
                    $scope.showModal = true;
                }, 0);
            };

            document.getElementById('SchedulingRecipes').onmousewheel = function (e) {
                if ($scope.showModal) {
                    e.preventDefault();
                }
            };

            dataService.getSettingsPromise().then(function () {
                $scope.showModal = !schedulingRecipesService.isEdgeEnabled();
            });

            $rootScope.$on('settingsUpdated', function () {
                $scope.showModal = !schedulingRecipesService.isEdgeEnabled();
            });

            $scope.hideMenu = false;
            $scope.recipesSearch = undefined;
            $scope.selectedRecipe = undefined;
            $scope.showRecipeTypeCreation = false;
            $scope.RECIPES_SAVING_STATES = schedulingRecipesService.recipesSavingStates;

            schedulingRecipesService.promises.data().then(function (res) {
                $scope.schedulingRecipesTypes = schedulingRecipesService.schedulingRecipesTypes();
                $scope.schedulingRecipes = schedulingRecipesService.schedulingRecipes();
            });

            $scope.saveRecipesOrder = function (recipeType) {
                $scope.schedulingRecipesTypes[recipeType.value].isEditable = !recipeType.isEditable;
                $scope.$broadcast('SaveRecipesPriorityOrder', recipeType);
            };

            $scope.sortRecipes = function (recipeType) {
                $scope.schedulingRecipesTypes[recipeType.value].isEditable = !recipeType.isEditable;
                $scope.$broadcast('ReorderRecipesPriorities', recipeType);
            };

            $scope.cancelRecipesOrder = function (recipeType) {
                $scope.schedulingRecipesTypes[recipeType.value].isEditable = !recipeType.isEditable;
                $scope.$broadcast('CancelRecipesPriorityOrder', recipeType);
            };

            $scope.getSavingRecipesState = function () {
                return schedulingRecipesService.getSavingRecipesState();
            };

            $scope.createNewRecipe = function (recipeType) {
                $scope.selectedRecipe = new SchedulingRecipe();
                $scope.selectedRecipe.Scenario_Type__c = recipeType.value;
            };

            $scope.editRecipe = function (recipe) {
                $scope.selectedRecipe = angular.copy(recipe);
            };

            $scope.onCancelRecipeEdit = function () {
                $scope.selectedRecipe = undefined;
            };

            $scope.onSaveRecipe = function (recipe) {
                $scope.selectedRecipe = undefined;
                $scope.$broadcast('SavedRecipe', recipe);
            };

            $scope.areThereRecipesToOrder = function (recipeType) {
                try {
                    return Object.keys(schedulingRecipesService.schedulingRecipes()[recipeType]).length < 2;
                } catch (e) {
                    return true;
                }
            };

            $scope.toggleShowRecipeTypeCreation = function (e) {
                $scope.showRecipeTypeCreation = !$scope.showRecipeTypeCreation;
            };
        }

        var template = '\n            <div id="SchedulingRecipes">\n                <div class="saving-banner" ng-show="getSavingRecipesState() !== RECIPES_SAVING_STATES.NOT_SAVING" ng-class="{\'settings-saved\' : getSavingRecipesState() == RECIPES_SAVING_STATES.SAVED}">\n                    <span ng-show="getSavingRecipesState() == RECIPES_SAVING_STATES.SAVING">Saving changes...</span>\n                    <span ng-show="getSavingRecipesState() == RECIPES_SAVING_STATES.SAVED">Your changes were saved.</span>\n                </div>\n                <div>\n                   <div ng-hide="selectedRecipe" class="slds-m-horizontal--medium"> \n                        <p>\n                            Stay two steps ahead of common scheduling challenges by activating \u201Crecipes\u201D of schedule optimization settings. \n                            Choose what happens to your schedule after appointment cancellations, time changes, and overlaps. \n                            Don\u2019t worry\u2014we\u2019ll tell you if a recipe conflicts with your existing optimization settings.\n                            <br>\n                            Cover all scenarios by creating multiple recipes for each category and putting them in priority order. \n                            If an event meets the criteria of more than one recipe, the higher-priority recipe is used.\n                        </p>\n                        <br>\n                         \n                        <div class="slds-button-group" role="group">\n                            <button class="slds-button slds-button_brand" style="width: 9rem; border-radius: .25rem .25rem .25rem .25rem" click-outside="toggleShowRecipeTypeCreation()" is-active="showRecipeTypeCreation" ng-click="toggleShowRecipeTypeCreation()">\n                                <span> New Recipe </span>\n                                <svg class="slds-button__icon" aria-hidden="true" style="margin-left: 0.8rem; margin-bottom: 0.1rem" > \n                                    <use xlink:href="' + settings.icons.down + '"/>\n                                </svg>\n                            </button>\n                            <div class="slds-dropdown-trigger slds-dropdown-trigger_click slds-button_last" ng-class="{\'slds-is-open\' : showRecipeTypeCreation}">\n                                <div class="slds-dropdown slds-dropdown_left slds-dropdown_actions recipeCreateDropdown">\n                                    <ul class="slds-dropdown__list" role="menu" style="width: 100%">\n                                        <li ng-repeat="(key, value) in schedulingRecipesTypes track by $index" class="cancel-margin slds-dropdown__item" role="presentation" style="width: 100%">\n                                            <button class="slds-button slds-button_brand" style="width: 100%" ng-click="createNewRecipe(value)">{{value.label}}</button>\n                                        </li>\n                                    </ul>\n                                </div>\n                            </div>\n                        </div>\n                        \n                        <div ng-if="schedulingRecipesTypes" class="slds-grid slds-wrap">\n                            <div ng-repeat="(key, value) in schedulingRecipesTypes track by key" class="cancel-margin slds-col slds-m-top_small recipeTypeBox" id="{{value.id}}">\n                                <div>\n                                    <span class="recipe-type-headline">{{value.label}}</span>             \n                                    <svg class="slds-icon-text-default recipe-drag-icon slds-m-right--small slds-float_right clickable" ng-click="sortRecipes(value)" title="Change priority order" ng-hide="value.isEditable || areThereRecipesToOrder(key)">\n                                        <use xlink:href="' + settings.icons.sort + '"/>\n                                    </svg>       \n                                </div>\n                                <div style="margin-top: 0.5rem">\n                                    {{value.description}}\n                                </div>                         \n                                <scheduling-recipes-organizer on-recipe-edit="editRecipe" recipe-type="value" class="slds-m-left--medium max-width"></scheduling-recipes-organizer>\n                                <div class="buttons-container">\n                                    <button ng-show="value.isEditable" class="slds-button slds-button_brand slds-float--right" ng-click="saveRecipesOrder(value)" style="margin-right: 0.8rem">\n                                        Save\n                                    </button>\n                                    <button ng-show="value.isEditable" class="slds-button slds-button_neutral slds-float--right" ng-click="cancelRecipesOrder(value)" style="margin-right: 0.5rem">\n                                        Cancel\n                                    </button>\n                                </div>\n                            </div>\n                        </div>\n                    </div>\n                    <scheduling-recipes-editor on-save="onSaveRecipe" on-cancel="onCancelRecipeEdit()" recipe="selectedRecipe" class="slds-m-left_x-small max-width" ng-show="selectedRecipe"></scheduling-recipes-editor>\n                </div>\n                \n                <lightning-modal show="showModal" header-text="Scheduling Recipes Unavailable" save-text="Go to Optimziation" on-save="onSaveModal" on-close-cancel="goBack" cancel-text="Go Back" with-footer="true">\n                    <slds-no-access footer-text="Please activate Enhanced Optimization in order to use Scheduling Recipes"></slds-no-access>\n                </lightning-modal>\n                \n            </div>\n        ';

        return {
            restrict: 'E',
            scope: {
                verifyFunctions: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('schedulingRecipesEditor', schedulingRecipesEditor);

    schedulingRecipesEditor.$inject = [];

    function schedulingRecipesEditor() {

        controllerFunction.$inject = ['$scope', '$q', 'schedulingRecipesService', 'dataService'];

        function controllerFunction($scope, $q, schedulingRecipesService, dataService) {

            $scope.isDeleting = false;
            $scope.isDirty = false;
            $scope.tooltipChangeStatus = false;
            $scope.tooltipInJeopardy = false;

            $scope.showModal = false;
            $scope.modalSaveText = 'OK';
            $scope.modalCancelText = 'Cancel';
            $scope.modalHeaderText = 'Saving Scheduling Recipe';

            $scope.onModalCancel = function () {
                $scope.showModal = false;
            };

            $scope.onModalSave = function () {
                $scope.showModal = false;
                $scope.saveRecipe(true);
            };

            $scope.gotSupportedData = false;
            $scope.actionsMenuOpen = false;
            $scope.showRequired = false;
            $scope.isSaving = false;
            $scope.isDeleting = false;
            $scope.scenarioTypesCancelled = schedulingRecipesConstants.scenarioTypesCancelled;
            $scope.forceStatusCategory = false;
            $scope.showCriteriaEditor = false;

            $scope.openCriteriaEditor = function () {
                $scope.showCriteriaEditor = !$scope.showCriteriaEditor;
            };

            dataService.getSettingsPromise().then(function () {
                $scope.policies = dataService.policies;
            });

            schedulingRecipesService.promises.data().then(function (res) {
                $scope.schedulingRecipesTypes = schedulingRecipesService.schedulingRecipesTypes();
                $scope.serviceAppointmentScheduleDispatchedStatuses = schedulingRecipesService.serviceAppointmentScheduleDispatchedStatuses();
                $scope.serviceAppointmentScheduleDispatchedStatuses.push({ ApiName: undefined, MasterLabel: 'Keep Original Status' });
                $scope.jeopardyReasons = schedulingRecipesService.serviceFieldsDescribe()['InJeopardyReason__c'].picklistValues;
                $scope.expectedBehaviors = schedulingRecipesService.expectedBehaviors();
                $scope.gotSupportedData = true;
            });

            $scope.save = function () {
                if (!$scope.isSaving) {

                    if ($scope.recipe.Active__c && dataService.getLastFetchedSettings().TriggerConfigurations['Enable Dynamic Gantt Fix Overlaps'][fieldNames.triggerConf.Run__c] === true && ($scope.recipe.Scenario_Type__c === schedulingRecipesConstants.scenarioTypesLengthened || $scope.recipe.Scenario_Type__c === schedulingRecipesConstants.scenarioTypesEmergency)) {

                        $scope.showModal = true;
                    } else {
                        $scope.saveRecipe(false);
                    }
                }
            };

            $scope.saveRecipe = function (disableFixOverlap) {
                $scope.isSaving = true;
                $scope.showRequired = false;

                if (!$scope.isValidRecipe()) {
                    $scope.showRequired = true;
                    $scope.isSaving = false;
                    return;
                }

                schedulingRecipesService.saveSchedulingRecipe($scope.recipe, disableFixOverlap).then(function (savedRecipe) {
                    $scope.recipe = savedRecipe;
                    $scope.isSaving = false;
                    $scope.onSave()($scope.recipe);
                }).catch(function () {
                    console.error('Failed to save scheduling recipe');
                    $scope.isSaving = false;
                });
            };

            $scope.$watch('recipe', function (newVal) {

                $scope.showRequired = false;

                if ($scope.recipe && $scope.recipe.Scenario_Type__c === $scope.scenarioTypesCancelled) {
                    $scope.recipe.Criteria__r.Criteria_Items__c.mandatory.statusCategory = [schedulingRecipesService.statusCategories.CANCELED];
                    $scope.forceStatusCategory = true;
                } else {
                    $scope.forceStatusCategory = false;
                }

                document.getElementById('SettingsForm').scrollTop = 0;
            });

            $scope.isLengthenedOrShortened = function () {

                if ($scope.recipe.Scenario_Type__c === schedulingRecipesConstants.scenarioTypesLengthened || $scope.recipe.Scenario_Type__c === schedulingRecipesConstants.scenarioTypesShortened) {
                    return true;
                } else {
                    return false;
                }
            };

            $scope.isValidRecipe = function () {

                if ($scope.recipe.Name === undefined || $scope.recipe.Scheduling_Policy__c === undefined) {
                    return false;
                }

                if ($scope.recipe.Criteria__r.User_Type__c.length === 0 || $scope.recipe.Criteria__r.Criteria_Items__c.mandatory.statusCategory.length == 0) {
                    return false;
                }

                if ($scope.recipe.Post_Actions__c.UnscheduledSAs.PutInJepordy && !$scope.recipe.Post_Actions__c.UnscheduledSAs.InJepordyReason) {
                    return false;
                }

                var isExpressionInvalid = schedulingRecipesService.isCustomLogicExpressionIsInvalid($scope.recipe.Criteria__r.Logic__c.custom, $scope.recipe.Criteria__r.Criteria_Items__c.custom);
                return !isExpressionInvalid;
            };

            $scope.getScenarioSpecificDescription = function () {

                if ($scope.recipe.Scenario_Type__c === schedulingRecipesConstants.scenarioTypesLengthened || $scope.recipe.Scenario_Type__c === schedulingRecipesConstants.scenarioTypesEmergency) {
                    return 'Minimum overlap in minutes for recipe to apply';
                } else if ($scope.recipe.Scenario_Type__c === schedulingRecipesConstants.scenarioTypesShortened) {
                    return 'Minimum schedule space created for recipe to apply (minutes)';
                } else {
                    // Canceled not showing Scenario_Specific__c
                    return '';
                }
            };
        }

        var template = ' \n            <div class="recipes-editor" ng-if="gotSupportedData && recipe">\n                <form name="recipesEditorForm" novalidate>\n                    <div class="slds-align_absolute-center slds-p-around--small">\n                        \n                        <!-- RECIPE NAME AND DESCRIPTION CONFIG -->\n                        <span class="recipe-name-description-box-container slds-m-left_xx-small">\n                            <div class="recipe-name-description-box">\n                                <div class="slds-m-bottom_xxx-small">\n                                    <input name="recipeName" class="truncate slds-input recipe-name-input" \n                                            type="text" placeholder="Enter a recipe name..." ng-model="recipe.Name" ng-model-options="{ debounce: 200 }" \n                                            ng-class="{\'has-error\': recipesEditorForm.recipeName.$invalid && showRequired}" ng-maxlength="80" maxlength="80" required>\n                                </div>\n                                <div>\n                                    <input class="truncate slds-input recipe-description-input" type="text" name="recipeDescription" placeholder="Enter a description..." ng-model="recipe.Description__c" ng-model-options="{ debounce: 200 }" maxlength="255">\n                                </div>\n                            </div>\n                        </span>\n                        \n                        <!-- RECIPE ACTIVE STATE -->\n                        <div class="recipe-state-btn">\n                            <div class="slds-form-element">\n                                <label class="slds-checkbox_toggle slds-grid">\n                                    <span class="slds-form-element__label slds-m-bottom_none" style="min-width: 3rem">{{ recipe.Active__c ? \'Active\' : \'Inactive\' }}</span>\n                                    <input name="checkbox-toggle-2" type="checkbox" aria-describedby="checkbox-toggle-2" ng-checked="recipe.Active__c" ng-click="recipe.Active__c = !recipe.Active__c"/>\n                                    <span id="checkbox-toggle-2" class="slds-checkbox_faux_container" aria-live="assertive" >\n                                        <span class="slds-checkbox_faux"></span>\n                                    </span>\n                                </label>\n                            </div>\n                        </div>\n                    </div>\n                    \n                    <!-- OBJECT DETAILED CONFIG -->\n                    <div class="slds-m-horizontal_x-large slds-m-vertical_x-small">\n                        <div class="slds-progress slds-progress_vertical">\n                            <ol class="slds-progress__list">\n                                <li class="slds-progress__item">\n                                    <div class="slds-progress__marker"></div>\n                                    <div class="slds-progress__item_content slds-grid slds-grid_align-spread">\n                                        <label class="select-label">{{ schedulingRecipesTypes[recipe.Scenario_Type__c].description }}</label>\n                                        <div class="slds-m-left--large select-container">\n                                            <picklist-setting-lightning object="recipe" value-field="Expected_Behavior__c" option-value-field="id" option-label-field="name" options="expectedBehaviors[recipe.Scenario_Type__c]"></picklist-setting-lightning>  \n                                        </div>                                                        \n                                    </div>\n                                </li>\n                                <li class="slds-progress__item">\n                                    <div class="slds-progress__marker"></div>\n                                    <div class="slds-progress__item_content slds-grid slds-grid_align-spread">\n                                        <div class="slds-m-top--small criteria-weak-text" title="{{ expectedBehaviors[recipe.Scenario_Type__c][recipe.Expected_Behavior__c].description }}">\n                                            {{ expectedBehaviors[recipe.Scenario_Type__c][recipe.Expected_Behavior__c].description }}\n                                        </div>    \n                                    </div>\n                                </li>\n                                <li class="slds-progress__item" ng-show="recipe.Scenario_Type__c !== scenarioTypesCancelled">\n                                    <div class="slds-progress__marker"></div>\n                                    <div class="slds-progress__item_content slds-grid slds-grid_align-spread">\n                                        <label class="select-label">\n                                            <input type="number" class="slds-input recipe-scenario-specific-input" ng-paste="$event.preventDefault()" onkeydown="return false" ng-model="recipe.Scenario_Specific__c" min="10" max="60" step="1"/> \n                                            {{ getScenarioSpecificDescription() }} \n                                        </label>\n                                    </div>\n                                </li>\n                                <li class="slds-progress__item" ng-if="recipe.Criteria__r">\n                                    <div class="slds-progress__marker"></div>\n                                    <div class="slds-progress__item_content slds-grid slds-grid_align-spread max-width">\n                                        <criteria-editor criteria="recipe.Criteria__r" style="width: 100%" is-lengthened-shortened="isLengthenedOrShortened()" object-type="schedulingRecipesTypes[recipe.Scenario_Type__c].relatedObject" class="max-width" force-status-category="forceStatusCategory" show-required="showRequired"></criteria-editor>\n                                    </div>\n                                </li>\n                                <li class="slds-progress__item">\n                                    <div class="slds-progress__marker"></div>\n                                    <div class="slds-progress__item_content slds-grid slds-grid_align-spread">                                        \n                                        <picklist-setting-lightning title="Optimize with Scheduling Policy" tooltip-top="-4rem" tooltip-left="-1.1rem" tooltip="Run resource schedule optimization with the selected scheduling policy." object="recipe" value-field="Scheduling_Policy__c" option-value-field="value" option-label-field="label" options="policies" is-required="showRequired"></picklist-setting-lightning>\n                                    </div>\n                                </li>\n                                <li class="slds-progress__item" ng-show="recipe.Scenario_Type__c == scenarioTypesCancelled">\n                                    <div class="slds-progress__marker"></div>\n                                    <div class="slds-progress__item_content slds-grid slds-grid_align-spread">\n                                        <label class="select-label">\n                                            Use the resource\u2019s last known location if it was updated in the last <input type="number" class="slds-input recipe-scenario-specific-input" ng-paste="$event.preventDefault()" onkeydown="return false" ng-model="recipe.LKL_Threshold__c" min="0" max="60" step="1"/> minutes.\n                                        </label>\n                                    </div>\n                                </li>\n                                <li class="slds-progress__item" ng-show="false">\n                                    <div class="slds-progress__marker"></div>\n                                    <div class="slds-progress__item_content slds-grid slds-grid_align-spread">\n                                        <label class="select-label">Semi automated recipe</label>\n                                        <div class="select-container">\n                                            <div class="slds-checkbox">\n                                                <label class="slds-checkbox__label">\n                                                    <input type="checkbox" ng-model="recipe.Semi_Automated__c"/>\n                                                    <span class="slds-checkbox_faux"></span>\n                                                </label>\n                                            </div>\n                                        </div>\n                                    </div> \n                                </li>\n                                <li class="slds-progress__item">\n                                    <div class="slds-progress__marker"></div>\n                                    <div class="slds-progress__item_content slds-grid slds-grid_align-spread">\n                                         <label class="select-label setting-selected-subitem">Actions to Take After Optimization</label>\n                                    </div>\n                                </li>\n                            </ol>\n                        </div>\n                        <ol class="slds-m-horizontal_xx-large slds-m-vertical_x-small">\n                            <li class="setting-row-container">\n                                <div class="slds-grid slds-grid_align-spread">\n                                    <label class="select-label">\n                                        Change scheduled appointments\u2019 status\n                                        <button class="slds-button slds-button_icon" aria-describedby="help" ng-mouseover="tooltipChangeStatus = true" ng-mouseleave="tooltipChangeStatus = false"> \n                                            <svg class="slds-button__icon" aria-hidden="true">\n                                                <use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="' + settings.icons.info + '" />\n                                            </svg>\n                                            <span class="slds-assistive-text">Help</span>\n                                            <div class="slds-popover slds-popover_tooltip slds-nubbin_bottom-left" role="tooltip" id="help" style="position: absolute; top: -7.4rem; left: -1.1rem; width: 170px;" ng-show="tooltipChangeStatus">\n                                                <div class="slds-popover__body">If an appointment is scheduled as part of the optimization, change its status to the selected value.</div>\n                                            </div>\n                                        </button>\n                                    </label>\n                                    <div class="select-container">\n                                        <picklist-setting-lightning object="recipe.Post_Actions__c.ScheduledSAs" value-field="Status" option-value-field="ApiName" option-label-field="MasterLabel" options="serviceAppointmentScheduleDispatchedStatuses"></picklist-setting-lightning>\n                                    </div>\n                                </div> \n                            </li>\n                            <li class="setting-row-container">\n                                <div class="slds-grid slds-grid_align-spread">\n                                     <label class="select-label">\n                                        Mark unscheduled appointments as In Jeopardy\n                                        <button class="slds-button slds-button_icon" aria-describedby="help" ng-mouseover="tooltipInJeopardy = true" ng-mouseleave="tooltipInJeopardy = false"> \n                                            <svg class="slds-button__icon" aria-hidden="true">\n                                                <use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="' + settings.icons.info + '" />\n                                            </svg>\n                                            <span class="slds-assistive-text">Help</span>\n                                            <div class="slds-popover slds-popover_tooltip slds-nubbin_bottom-left" role="tooltip" id="help" style="position: absolute; top: -5.1rem; left: -1.1rem; width: 170px;" ng-show="tooltipInJeopardy">\n                                                <div class="slds-popover__body">Appointments that are in jeopardy are shown on the Gantt with a red flag.</div>\n                                            </div>\n                                        </button>\n                                     </label>\n                                     <div class="select-container">\n                                        <div class="slds-checkbox">\n                                            <label class="slds-checkbox__label">\n                                                <input type="checkbox" ng-model="recipe.Post_Actions__c.UnscheduledSAs.PutInJepordy"/>\n                                                <span class="slds-checkbox_faux"></span>\n                                            </label>\n                                        </div>\n                                     </div>\n                                </div>\n                            </li>\n                            <li class="setting-row-container" ng-show="recipe.Post_Actions__c.UnscheduledSAs.PutInJepordy">\n                                <div class="slds-grid slds-grid_align-spread">\n                                     <label class="select-label">\n                                        Jeopardy Reason\n                                    </label>\n                                    <div class="select-container">\n                                        <picklist-setting-lightning object="recipe.Post_Actions__c.UnscheduledSAs" value-field="InJepordyReason" option-value-field="value" option-label-field="label" options="jeopardyReasons" is-required="showRequired"></picklist-setting-lightning>\n                                    </div>\n                                </div>\n                            </li>\n                        </ol>                \n                    </div>\n                     \n                    <div class="slds-m-vertical_x-large slds-m-horizontal_medium" style="text-align: right">\n                        <button class="slds-button slds-button_outline-brand" ng-click="onCancel()">Cancel</button>\n                        <button class="slds-button slds-button_brand" ng-click="save()" ng-disabled="isSaving">Save</button>\n                    </div>\n                </form>\n                \n                <lightning-modal show="showModal" with-footer="true" on-save="onModalSave" save-text="{{modalSaveText}}" cancel-text="{{modalCancelText}}" on-close-cancel="onModalCancel" header-text="{{modalHeaderText}}">\n                    <div style="text-align: center">\n                        <div>Save this overlap recipe?</div>\n                        <br>\n                        <div>The Fix Overlaps feature is currently enabled in your org.</div>\n                        <div>If you save this recipe, we\u2019ll turn off that feature to avoid conflicts. <a target="_blank" rel="noopener noreferrer" href="https://help.salesforce.com/articleView?id=pfs_fix_overlaps.htm">Learn More</a></div>\n                    </div> \n                </lightning-modal>\n                \n            </div>';

        return {
            restrict: 'E',
            scope: {
                recipe: '=',
                onCancel: '&',
                onSave: '&'
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('schedulingRecipesMenu', schedulingRecipesMenu);

    schedulingRecipesMenu.$inject = [];

    function schedulingRecipesMenu() {

        controllerFunction.$inject = ['$scope', '$q', 'schedulingRecipesService'];

        function controllerFunction($scope, $q, schedulingRecipesService) {

            schedulingRecipesService.promises.data().then(function (res) {
                $scope.schedulingRecipesData = schedulingRecipesService.schedulingRecipesData();
            });

            $scope.onClickRecipe = function (recipe) {

                try {

                    if (!$scope.onRecipeSelected()) {

                        $scope.selectedRecipeType = undefined;

                        if ($scope.selectedRecipe && $scope.selectedRecipe.Id === recipe.Id) {
                            $scope.selectedRecipe = undefined;
                        } else {
                            $scope.selectedRecipe = angular.copy(recipe);
                        }
                    } else {
                        $scope.onRecipeSelected()(angular.copy(recipe));
                    }
                } catch (e) {
                    console.error(e);
                }
            };

            $scope.onClickRecipeType = function (recipeType) {

                try {

                    if (!$scope.onRecipeTypeSelected()) {

                        $scope.selectedRecipe = undefined;

                        if ($scope.selectedRecipeType === recipeType) {
                            $scope.selectedRecipeType = undefined;
                        } else {
                            $scope.selectedRecipeType = recipeType;
                        }
                    }

                    $scope.onRecipeTypeSelected()(recipeType);
                } catch (e) {
                    console.error(e);
                }
            };

            $scope.toggleRecipeType = function (recipeType) {
                $scope.schedulingRecipesData.schedulingRecipesTypes[recipeType].isOpen = !$scope.schedulingRecipesData.schedulingRecipesTypes[recipeType].isOpen;
            };
        }

        var template = '\n                <ul class="slds-tree clear-margin-tree-item" ng-if="schedulingRecipesData">\n                    <li ng-repeat="(key, value) in schedulingRecipesData.schedulingRecipes track by key" class="cancel-margin slds-m-top_xx-small">\n                        <div class="recipe-type-menu-item" ng-class="{\'slds-is-selected\' : selectedRecipeType === key}">\n                            <div class="arrowBox">\n                                <button class="slds-button slds-button_icon slds-align--absolute-center" aria-hidden="true" title="Expand Tree Branch" ng-click="toggleRecipeType(key)">\n                                    <i ng-class="{ \'fa fa-angle-down\' : schedulingRecipesData.schedulingRecipesTypes[key].isOpen, \'fa fa-angle-right\': !schedulingRecipesData.schedulingRecipesTypes[key].isOpen}"/>\n                                </button>\n                            </div>\n                            <div class="truncate scheduling-recipes-menu-item-text">\n                                <span ng-click="onClickRecipeType(key)">{{schedulingRecipesData.schedulingRecipesTypes[key].label}}</span>\n                            </div> \n                        </div>\n                        <ul class="slds-tree clear-margin-tree-item" ng-show="schedulingRecipesData.schedulingRecipesTypes[key].isOpen">        \n                            <li ng-repeat="recipe in schedulingRecipesData.schedulingRecipes[key]" \n                                class="truncate recipe-menu-item slds-nav-vertical__item" ng-class="{ \'slds-is-active\': recipe.Id ===  selectedRecipe.Id}">\n                                <span class="slds-nav-vertical__action recipe-picker-text-overflow" ng-click="onClickRecipe(recipe)">\n                                    <span class="li-palette-name-span">{{recipe.Name}}</span>\n                                </span>\n                            </li>\n                        </ul>\n                    </li>\n                </ul>\n            ';

        return {
            restrict: 'E',
            scope: {
                onRecipeSelected: '&',
                onRecipeTypeSelected: '&',
                selectedRecipe: '=',
                selectedRecipeType: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();

// $scope.createNewRecipe = function (type) {
//     let newRecipe = new SchedulingRecipe();
//     newRecipe.Scenario_Type__c = type;
//     $scope.onClickRecipe(newRecipe);
// };

// <li className="slds-nav-vertical__item">
//     <span className="recipe-picker-text-overflow new-recipe-button-wrapper">
//         <div className="new-recipe-button" ng-click="createNewRecipe(key)">
//             <span className="slds-text-not-selected">
//                 <svg
//                     className="slds-button__icon slds-button__icon_small slds-button__icon_left"
//                     aria-hidden="true">
//                     <use xlink:href="${settings.icons.add}"></use>
//                 </svg>New
//             </span>
//         </div>
//     </span>
// </li>
'use strict';

(function () {

    angular.module('SettingsApp').directive('schedulingRecipesOrganizer', schedulingRecipesOrganizer);

    schedulingRecipesOrganizer.$inject = [];

    function schedulingRecipesOrganizer() {

        controllerFunction.$inject = ['$scope', 'schedulingRecipesService', '$timeout'];

        function controllerFunction($scope, schedulingRecipesService, $timeout) {

            $scope.isDeleting = false;
            $scope.isDirty = false;

            $scope.showModal = { value: false };
            $scope.modalText = '';
            $scope.modalSaveText = 'Save';
            $scope.modalCancelText = 'Cancel';
            $scope.modalHeaderText = undefined;
            $scope.onModalSave = undefined;

            $scope.parseRecipes = function () {

                $scope.schedulingRecipes = [];

                $scope.recipesMap = schedulingRecipesService.schedulingRecipes()[$scope.recipeType.value];

                if ($scope.recipesMap) {
                    Object.keys($scope.recipesMap).map(function (key) {
                        return $scope.schedulingRecipes.push($scope.recipesMap[key]);
                    });
                }

                $scope.schedulingRecipes = angular.copy($scope.schedulingRecipes);

                if ($scope.schedulingRecipes) {
                    $scope.schedulingRecipes.sort(function (a, b) {
                        return a.Priority__c - b.Priority__c;
                    });
                }

                $scope.isDirty = false;
                $scope.sortableOptions.disabled = !$scope.recipeType.isEditable;
            };

            $scope.sortableOptions = {
                stop: function stop(e, ui) {
                    if ($scope.schedulingRecipes) {
                        for (var index in $scope.schedulingRecipes) {
                            $scope.schedulingRecipes[index].Priority__c = parseInt(index);
                        }
                    }

                    $scope.isDirty = true;
                },
                containment: '#' + $scope.recipeType.id,
                disabled: !$scope.recipeType.isEditable
            };

            schedulingRecipesService.promises.data().then(function (res) {
                if (!!$scope.recipeType) {
                    $scope.parseRecipes();
                }
            });

            $scope.$watch("recipeType", function (newValue, oldValue) {
                if (!!newValue) {
                    $scope.parseRecipes();
                }
            });

            $scope.$on('CancelRecipesPriorityOrder', function (event, recipeTypeParam) {
                if (recipeTypeParam.value === $scope.recipeType.value) {
                    $scope.sortableOptions.disabled = !recipeTypeParam.isEditable;
                    $scope.parseRecipes();
                }
            });

            $scope.$on('SaveRecipesPriorityOrder', function (event, recipeTypeParam) {
                if (recipeTypeParam.value === $scope.recipeType.value) {
                    $scope.sortableOptions.disabled = !recipeTypeParam.isEditable;
                    if ($scope.isDirty === true && !recipeTypeParam.isEditable) {
                        $scope.save();
                    }
                }
            });

            $scope.$on('ReorderRecipesPriorities', function (event, recipeTypeParam) {
                if (recipeTypeParam.value === $scope.recipeType.value) {
                    $scope.sortableOptions.disabled = !recipeTypeParam.isEditable;
                    $scope.isDirty = false;
                }
            });

            $scope.$on('SavedRecipe', function (event, recipe) {
                if (recipe.Scenario_Type__c === $scope.recipeType.value) {
                    $scope.parseRecipes();
                }
            });

            $scope.edit = function (recipe) {
                try {
                    $scope.onRecipeEdit()(recipe);
                } catch (e) {
                    console.error(e);
                }
            };

            $scope.save = function () {
                schedulingRecipesService.saveSchedulingRecipesPriorities($scope.schedulingRecipes, $scope.recipeType.value).then(function (res) {
                    if (res) {
                        $scope.parseRecipes();
                        $scope.isDirty = false;
                    }
                });
            };

            $scope.handleDeleteRecipe = function (recipe) {
                $scope.isDeleting = true;

                schedulingRecipesService.deleteSchedulingRecipe(recipe).then(function (res) {
                    $scope.parseRecipes();
                    $scope.isDeleting = false;
                }).catch(function () {
                    console.error('Failed to delete scheduling recipe');
                    $scope.parseRecipes();
                    $scope.isDeleting = false;
                });
            };

            $scope.delete = function (recipe) {
                if (!$scope.isDeleting) {
                    if (schedulingRecipesService.schedulingRecipes()[recipe.Scenario_Type__c][recipe.Id].Active__c) {

                        $scope.modalText = 'Deactivate the recipe and try again.';
                        $scope.modalSaveText = 'Got It';
                        $scope.modalCancelText = undefined;
                        $scope.modalHeaderText = 'Active scheduling recipes can’t be deleted';
                        $scope.showModal.value = true;
                    } else {

                        $scope.modalText = 'Delete the ' + recipe.Name + ' scheduling recipe?';
                        $scope.modalSaveText = 'OK';
                        $scope.modalCancelText = 'Cancel';
                        $scope.modalHeaderText = 'Delete Scheduling Recipe';

                        $scope.onModalSave = function () {
                            $scope.handleDeleteRecipe(recipe);
                        };

                        $scope.showModal.value = true;
                    }
                }
            };
        }

        var template = '\n            <div ng-if="recipeType" class="recipeOrganizerBox">\n                <ol ui-sortable="sortableOptions" ng-model="schedulingRecipes" class="recipe-drag-list-box">\n                    <li ng-repeat="(key, value) in schedulingRecipes track by $index" ng-class="{\'slds-card\': recipeType.isEditable, \'slds-box\': !recipeType.isEditable}" class="slds-m-bottom--x-small recipe-order-item"> \n                        <span ng-show="recipeType.isEditable" class="slds-icon_container slds-icon-utility-announcement recipe-drag-icon-box" title="Drag to change priority order">\n                            <svg class="slds-icon-text-default recipe-drag-icon slds-m-right--small slds-float_left clickable">\n                                <use xlink:href="' + settings.icons.dragdrop + '"/>\n                            </svg>\n                        </span>\n                        <span class="recipe-name-description-box slds-float_left">\n                            <div class="slds-truncate">\n                                <span ng-show="recipeType.isEditable">{{ value.Priority__c + 1 }}. </span>{{value.Name}}\n                            </div>\n                            <div class="slds-m-top--xx-small" style="font-size: 0.8rem">\n                                <span ng-class="{\'active-recipe\' : value.Active__c, \'inactive-recipe\' : !value.Active__c}"></span>\n                                <span>{{ value.Active__c ? \'Active\' : \'Inactive\' }}</span>\n                            </div>\n                        </span>\n                        <div class="slds-grid slds-align_absolute-center" ng-hide="recipeType.isEditable">\n                            <span ng-click="edit(value)"  title="Edit recipe">\n                                <svg class="slds-icon-text-default single-recipe-actions slds-m-right--small slds-float_left clickable">\n                                    <use xlink:href="' + settings.icons.edit + '"/>\n                                </svg>\n                            </span>\n                            <span ng-click="delete(value)"  title="Delete recipe">\n                                <svg class="slds-icon-text-default single-recipe-actions slds-float_left clickable">\n                                    <use xlink:href="' + settings.icons.delete + '"/>\n                                </svg>\n                            </span>\n\n                        </div>\n                    </li>\n                    <li ng-show="schedulingRecipes.length == 0" ng-class="{\'slds-card\': recipeType.isEditable, \'slds-box\': !recipeType.isEditable}" class="slds-m-bottom--x-small recipe-order-item">                 \n                        <span class="recipe-name-description-box slds-float_left">\n                            No recipes yet.\n                        </span>\n                    </li>\n                </ol>\n                \n                <lightning-modal show="showModal.value" with-footer="true" on-save="onModalSave" save-text="{{modalSaveText}}" cancel-text="{{modalCancelText}}" header-text="{{modalHeaderText}}">\n                    <div style="text-align: center">\n                        {{ modalText }}\n                    </div>\n                </lightning-modal>\n            </div>\n        ';

        return {
            restrict: 'E',
            scope: {
                recipeType: '=',
                onRecipeEdit: '&'
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('lifeCycleCreation', lifeCycleCreation);

    lifeCycleCreation.$inject = ['serviceAppointmentLifeCycleService'];

    function lifeCycleCreation(serviceAppointmentLifeCycleService) {

        controllerFunction.$inject = ['$scope', '$rootScope', 'primitiveType', 'dataService'];

        function controllerFunction($scope, $rootScope, primitiveType, dataService) {

            $scope.verifyFunctions.push(function () {
                return console.log('verify - lifeCycleCreation');
            });
            $scope.primitiveType = primitiveType;

            $scope.HighOrLow = [{ label: 'Highest Level', value: 'Highest' }, { label: 'Lowest Level', value: 'Lowest' }];

            $scope.useHighOrLowPolicy = false;

            $rootScope.$on('settingsUpdated', function () {
                $scope.useHighOrLowPolicy = dataService.getDraftSettings().TriggerConfigurations['Enable Service Auto Classification'][fieldNames.triggerConf.Run__c];
            });

            dataService.getSettingsPromise().then(function () {
                $scope.useHighOrLowPolicy = dataService.getDraftSettings().TriggerConfigurations['Enable Service Auto Classification'][fieldNames.triggerConf.Run__c];
            });

            $scope.settings = dataService.getDraftSettings();
        }

        var template = '\n            <custom-settings-wrapper primitive-type="primitiveType.boolean" label-field-name="\'Description__c\'" value-field-name="\'Run__c\'" setting="settings.TriggerConfigurations[\'Service Type Derive Due Date\']" tooltip-text="On new service appointments, set the Due Date to the current date + the due date offset defined on the appointment\u2019s work type"></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.boolean" label-field-name="\'Description__c\'" value-field-name="\'Run__c\'" setting="settings.TriggerConfigurations[\'Pinned Service Not Changed\']" tooltip-text="Pinned Service appointments will not be rescheduled by the scheduling engine"></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.boolean" label-field-name="\'Description__c\'" value-field-name="\'Run__c\'" setting="settings.TriggerConfigurations[\'Service Duration Longer Than Minute\']" tooltip-text="In case the Duration field is blank upon Service appointment creation, set the duration to one hour"></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.boolean" label="\'Use polygons to assign service territories\'" value-field-name="\'Run__c\'" setting="settings.TriggerConfigurations[\'Enable Service Auto Classification\']" tooltip-text="If selected, the service territory field on service appointments is populated based on the map polygon that the address is located in."></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.picklist" options="HighOrLow" label="\'Territory assignment policy\'" value-field-name="\'Low_Or_High_Territory_Classification__c\'" setting="settings.LogicSettings" tooltip-text="Assign service appointments to the highest or lowest-level territory in the hierarchy depending on your settings." ng-show="useHighOrLowPolicy"></custom-settings-wrapper>\n        ';

        return {
            restrict: 'E',
            scope: {
                formObject: '=',
                verifyFunctions: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('lifeCycleStatusDefinitions', lifeCycleStatusDefinitions);

    lifeCycleStatusDefinitions.$inject = ['serviceAppointmentLifeCycleService'];

    function lifeCycleStatusDefinitions(serviceAppointmentLifeCycleService) {

        controllerFunction.$inject = ['$scope', 'primitiveType', 'dataService'];

        function controllerFunction($scope, primitiveType, dataService) {
            $scope.verifyFunctions.push(function () {
                return console.log('verify - lifeCycleCreation');
            });
            $scope.primitiveType = primitiveType;
            $scope.settings = dataService.getDraftSettings();

            serviceAppointmentLifeCycleService.loadData().then(function () {
                $scope.serverSettings = serviceAppointmentLifeCycleService.settings;
            });
        }

        var template = '\n            <custom-settings-wrapper ng-repeat="status in settings.Dictionaries track by $index" \n                                        primitive-type="primitiveType.picklist" \n                                        label-field-name="\'Default_Value__c\'" \n                                        value-field-name="\'Value__c\'"\n                                        options="serverSettings.StatusList" \n                                        setting="status" ></custom-settings-wrapper>\n        ';

        return {
            restrict: 'E',
            scope: {
                formObject: '=',
                verifyFunctions: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('lifeCycleStatusTransition', lifeCycleStatusTransition);

    lifeCycleStatusTransition.$inject = ['serviceAppointmentLifeCycleService'];

    function lifeCycleStatusTransition(serviceAppointmentLifeCycleService) {

        controllerFunction.$inject = ['$scope', 'dataService', 'primitiveType', '$rootScope'];

        function controllerFunction($scope, dataService, primitiveType, $rootScope) {

            //$scope.verifyFunctions.push( () => console.log('verify - lifeCycleStatusTransition'));
            $scope.primitiveType = primitiveType;
            $scope.settings = dataService.getDraftSettings();
            $scope.showMore = false;
            $scope.invalid = false;
            $scope.errorMsg = '';
            $scope.statusMap = {};

            serviceAppointmentLifeCycleService.loadData().then(function () {
                $scope.serverSettings = serviceAppointmentLifeCycleService.settings;
                $scope.apexPagesList = angular.copy($scope.serverSettings.ApexPages);
                $scope.apexPagesList.unshift({ value: null, label: '--- Select custom VisualForce page ---' });

                for (var i = 0; i < $scope.serverSettings.StatusList.length; i++) {
                    $scope.statusMap[$scope.serverSettings.StatusList[i].value] = $scope.serverSettings.StatusList[i].label;
                }
            });

            $scope.setPlaceholder = function (allowedProf) {
                if (allowedProf && allowedProf.split(',').length > 0) return allowedProf.split(',').length + ' profiles selected';else return 'All profiles allowed';
            };

            $scope.setBorderClass = function (status) {
                var classString = 'left-border left-border-';

                if (status) {
                    var statBoy = $scope.statusMap[status] || status;
                    return classString + statBoy.replace(' ', '').toLowerCase();
                } else return classString + 'default';
            };

            $scope.addFlow = function (from, to, profiles, apexPage) {
                from = from || $scope.serverSettings.StatusList[0].value;
                to = to || $scope.serverSettings.StatusList[1].value;
                profiles = profiles || '';
                var status = {
                    'Name': from + '-' + to
                };

                status[fieldNames.statusTransitions.From_Status__c] = from;
                status[fieldNames.statusTransitions.To_Status__c] = to;
                status[fieldNames.statusTransitions.Allowed_Profiles__c] = profiles;
                status[fieldNames.statusTransitions.Custom_VF__c] = apexPage;
                $scope.settings.ServiceLegalStatuses.push(status);
            };

            $scope.removeStatusFlow = function (index) {
                $scope.invalid = false;
                delete $scope.settings.ServiceLegalStatuses[index];
                $scope.settings.ServiceLegalStatuses.splice(index, 1);
            };

            $scope.checkFlow = function (status) {
                $scope.invalid = false;
            };

            $rootScope.$on('transitionsError', function (event, args) {

                if (args.msg == null) {
                    $scope.invalid = false;
                    return;
                }

                $scope.errorMsg = args.msg;
                $scope.invalid = true;
            });

            $scope.getPackagedFieldName = function (field) {
                return fieldNames.statusTransitions[field];
            };

            $scope.getTriggerConfFieldName = function (field) {
                return fieldNames.triggerConf[field];
            };

            $scope.setDiagram = function () {
                var diagramText = '';

                if ($scope.settings && !$scope.settings.ServiceLegalStatuses) return diagramText;

                function setDiagramClass(status) {
                    return '<' + status.replace(' ', '').toLowerCase() + '>';
                }

                diagramText = '                \n                #.none: fill=#a5e2d6\n                #.scheduled: fill=#F9D058\n                #.dispatched: fill=#8DD8FA\n                #.inprogress: fill=#DCC984\n                #.completed: fill=#95D055\n                #.cannotcomplete: fill=#EA8288\n                #.canceled: fill=#BEBCBA\n                #.default: fill=#B7C9EA\n                #stroke: #232323\n                #lineWidth: 2\n                #arrowSize: 0.7\n                #fontSize: 10\n                #zoom: 1\n                #fill: #f4f6f9\n                ';

                for (var i = 0; i < $scope.settings.ServiceLegalStatuses.length; i++) {
                    var from = $scope.statusMap[$scope.settings.ServiceLegalStatuses[i][fieldNames.statusTransitions.From_Status__c]],
                        to = $scope.statusMap[$scope.settings.ServiceLegalStatuses[i][fieldNames.statusTransitions.To_Status__c]];
                    diagramText += '[' + from + ']->[' + to + ']\n';
                }

                return diagramText;
            };

            $scope.closeAllOthers = function (status, index) {
                $rootScope.$broadcast('closeAllOthers', { status: status, index: index });
            };
        }

        var template = '\n        <div class="section-settings">Service Appointment Status Transitions\n          <checkbox class="transitions-checkbox" label="" object="settings.GeneralConfig[\'Status Transitions Policy\']" value-field="\'Run__c\'"></checkbox>\n        </div>\n        <div class="slds transitions-table" ng-show="settings.GeneralConfig[\'Status Transitions Policy\'][getTriggerConfFieldName(\'Run__c\')]">\n            <table class="slds-table slds-table--fixed-layout" id="transitions-table">\n  <thead>\n    <tr class="slds-text-title--caps">\n      \n      <th class="header-picklist">\n          <span class="slds-truncate" title="From">From</span>\n      </th>\n      <th class="header-picklist">\n          <span class="slds-truncate" title="To">To</span>\n      </th>\n      <th class="header-profiles" ng-show="showMore">\n          <span class="slds-truncate" title="Allowed Profiles">Allowed Profiles</span>\n      </th>\n      <th class="header-custom-vf" ng-show="showMore">\n          <span class="slds-truncate" title="Custom Visual Force">Custom Visual Force</span>\n      </th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr ng-repeat="status in settings.ServiceLegalStatuses track by $index">\n      <td>\n        <div class="from-cell">\n            <custom-settings-wrapper ng-class="setBorderClass(status[getPackagedFieldName(\'From_Status__c\')])"\n                    primitive-type="primitiveType.picklist" \n                    value-field-name="\'From_Status__c\'"\n                    options="serverSettings.StatusList" \n                    setting="status" \n                    change="checkFlow(status)"\n                    >\n                </custom-settings-wrapper>\n        </div>\n      </td>\n      <td>\n        <div class="to-cell">\n            <custom-settings-wrapper  ng-class="setBorderClass(status[getPackagedFieldName(\'To_Status__c\')])"\n                    primitive-type="primitiveType.picklist" \n                    value-field-name="\'To_Status__c\'"\n                    options="serverSettings.StatusList" \n                    setting="status" \n                    change="checkFlow(status)"\n                    >\n                </custom-settings-wrapper>\n        </div>\n      </td>\n      <td ng-show="showMore">\n        <div class="profiles-cell">\n            <custom-settings-wrapper \n                primitive-type="primitiveType.multi" \n                value-field-name="\'Allowed_Profiles__c\'"\n                options="serverSettings.AllProfiles"\n                placeholder="setPlaceholder(status[getPackagedFieldName(\'Allowed_Profiles__c\')])"\n                setting="status" \n                ng-click="closeAllOthers(status, $index)">\n            </custom-settings-wrapper>\n        </div>\n      </td>\n      <td ng-show="showMore">\n        <div class="customvf-cell">\n            <custom-settings-wrapper  \n                primitive-type="primitiveType.picklist" \n                value-field-name="\'Custom_VF__c\'"\n                options="apexPagesList" \n                setting="status" >\n            </custom-settings-wrapper>\n        </div>\n      </td>\n\n        <td>\n        <div class="delete-cell">\n            <a href="javascript:void(0);" ng-click="removeStatusFlow($index)">\n                <svg aria-hidden="true" class="delete-icon" ng-class="{\'showless\': showMore == false}">\n                    <use xlink:href="' + settings.icons.delete + '"></use>\n                </svg>\n            </a>\n        </div>\n      </td>\n    </tr>\n  </tbody>\n</table>\n<div class="newAutomatorError" ng-if="invalid">\n    <ui-error>\n        <main-content>\n            <div>{{errorMsg}}</div>\n        </main-content>\n    </ui-error>\n</div>\n</div>\n\n<div class="table-buttons" ng-show="settings.GeneralConfig[\'Status Transitions Policy\'][getTriggerConfFieldName(\'Run__c\')]">\n  <div class="add-flow-button" ng-click="addFlow()">Add Flow</div>\n  <a href="javascript:void(0);" ng-show="!showMore" ng-click="showMore = true;">More details</a>\n  <a href="javascript:void(0);" ng-show="showMore" ng-click="showMore = false;">Less details</a>\n</div>\n<div id="statusDiagram" ng-if="settings.ServiceLegalStatuses" ng-show="settings.GeneralConfig[\'Status Transitions Policy\'][getTriggerConfFieldName(\'Run__c\')]">\n  <canvas nomnoml nomnoml-model="setDiagram()"</canvas>\n</div>\n  ';

        return {
            restrict: 'E',
            scope: {
                formObject: '=',
                verifyFunctions: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('sharingAutomation', sharingAutomation);

    sharingAutomation.$inject = ['sharingService', 'primitiveType'];

    function sharingAutomation(sharingService, primitiveType) {

        controllerFunction.$inject = ['$scope', 'dataService', '$rootScope'];

        function controllerFunction($scope, dataService, $rootScope) {
            $scope.primitiveType = primitiveType;
            $scope.settings = dataService.getDraftSettings();
            dataService.getSettingsPromise().then(function () {
                $scope.automators = dataService.getAutomators('Sched008_TimePhaseSharing');
                $scope.showSharingSettings = dataService.getDraftSettings().GeneralConfig['Is Fresh Install'][fieldNames.General_Config__c.Run__c];
            });

            $rootScope.$on('settingsUpdated', function () {
                $scope.automators = dataService.getAutomators('Sched008_TimePhaseSharing');
            });
        }

        var template = '\n            <div ng-if="showSharingSettings">\n                <custom-settings-wrapper id="__sharingtriggers" primitive-type="primitiveType.boolean" label-field-name="\'Description__c\'" value-field-name="\'Run__c\'" setting="settings.TriggerConfigurations[\'Status Actions\']"></custom-settings-wrapper>\n            </div>\n            <custom-settings-wrapper primitive-type="primitiveType.boolean" label-field-name="\'Description__c\'" value-field-name="\'Run__c\'" setting="settings.TriggerConfigurations[\'Enable workorder parent sharing\']"></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.boolean" label-field-name="\'Description__c\'" value-field-name="\'Run__c\'" setting="settings.TriggerConfigurations[\'Enable account parent sharing\']"></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.boolean" label-field-name="\'Description__c\'" value-field-name="\'Run__c\'" setting="settings.TriggerConfigurations[\'Enable opportunity parent sharing\']"></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.boolean" label-field-name="\'Description__c\'" value-field-name="\'Run__c\'" setting="settings.TriggerConfigurations[\'Enable asset parent sharing\']"></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.boolean" label-field-name="\'Description__c\'" value-field-name="\'Run__c\'" setting="settings.TriggerConfigurations[\'Location Based Sharing\']"></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.boolean" label-field-name="\'Description__c\'" value-field-name="\'Run__c\'" setting="settings.TriggerConfigurations[\'User Locations\']"></custom-settings-wrapper>\n            <custom-settings-wrapper primitive-type="primitiveType.boolean" label="\'Make assigned resources followers of service appointments that are Dispatched or In Progress\'" value-field-name="\'Run__c\'" setting="settings.TriggerConfigurations[\'Allow follow\']" tooltip-text="Assigned resources are removed as followers when an appointment\u2019s status is no longer Dispatched or In Progress"></custom-settings-wrapper>\n            <div ng-if="showSharingSettings">         \n                <custom-settings-wrapper primitive-type="primitiveType.boolean" label-field-name="\'Description__c\'" value-field-name="\'Run__c\'" setting="settings.TriggerConfigurations[\'Edit Sharing For Crew Members\']"></custom-settings-wrapper>\n            </div>\n            <div class="automatorExp">Time Based Sharing Scheduled Jobs - will share and remove sharing for Service Resources based on time-phased Resource Memberships</div>\n            <automators id="__tbssj" objects="automators" class-names="[\'Sched008_TimePhaseSharing\']"></automators>\n        ';

        return {
            restrict: 'E',
            scope: {
                verifyFunctions: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('sharingCalendarSync', sharingCalendarSync);

    sharingCalendarSync.$inject = ['sharingService'];

    function sharingCalendarSync(sharingService) {

        controllerFunction.$inject = ['$scope', 'primitiveType', 'dataService'];

        function controllerFunction($scope, primitiveType, dataService) {

            $scope.verifyFunctions.push(function () {
                return console.log('verify - sharingCalendarSync');
            });
            $scope.primitiveType = primitiveType;
            $scope.settings = dataService.getDraftSettings();
        }

        var template = '\n            <content-collapse-wrapper header="\'Service Appointment\'" open="true">\n                <content>\n                    <custom-settings-wrapper primitive-type="primitiveType.boolean" label="\'Synchronize Services from Salesforce calendar events\'" value-field-name="\'From_Salesforce__c\'" setting="settings.Synchronize.ServiceAppointment" ></custom-settings-wrapper>\n                    <custom-settings-wrapper primitive-type="primitiveType.boolean" label="\'Synchronize Services to Salesforce calendar events\'" value-field-name="\'To_Salesforce__c\'" setting="settings.Synchronize.ServiceAppointment" ></custom-settings-wrapper>\n                    <custom-settings-wrapper primitive-type="primitiveType.text" label="\'Calendar Event type\'" tooltip-text="This event type will create a Work Order and a Service appointment" value-field-name="\'Display_Name__c\'" setting="settings.Synchronize.ServiceAppointment"  ></custom-settings-wrapper>\n                    <custom-settings-wrapper primitive-type="primitiveType.boolean" label="\'Enforce validations when syncing Service Appointments and Salesforce calendar events\'" value-field-name="\'Enforce_Validations__c\'" setting="settings.Synchronize.ServiceAppointment" ></custom-settings-wrapper>\n                </content>\n            </content-collapse-wrapper>\n\n            <content-collapse-wrapper header="\'Resource Absence\'" open="true">\n                <content>\n                    <custom-settings-wrapper primitive-type="primitiveType.boolean" label="\'Synchronize Absences from Salesforce calendar\'" value-field-name="\'From_Salesforce__c\'" setting="settings.Synchronize.ResourceAbsence" ></custom-settings-wrapper>\n                    <custom-settings-wrapper primitive-type="primitiveType.boolean" label="\'Synchronize Absences to Salesforce calendar\'" value-field-name="\'To_Salesforce__c\'" setting="settings.Synchronize.ResourceAbsence" ></custom-settings-wrapper>\n                    <custom-settings-wrapper primitive-type="primitiveType.text" label="\'Calendar Event type\'" tooltip-text="This event type will create a Resource Absence" value-field-name="\'Display_Name__c\'" setting="settings.Synchronize.ResourceAbsence" ></custom-settings-wrapper>\n                    <custom-settings-wrapper primitive-type="primitiveType.boolean" label="\'Enforce validation rules when syncing resource absences and Salesforce calendar events\'" value-field-name="\'Enforce_Validations__c\'" setting="settings.Synchronize.ResourceAbsence" ></custom-settings-wrapper>\n                   \n                </content>\n            </content-collapse-wrapper>\n        ';

        return {
            restrict: 'E',
            scope: {
                verifyFunctions: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').service('sharingService', sharingService);

    sharingService.$inject = ['settingsUtils', 'dataService'];

    function sharingService(settingsUtils, dataService) {

        var prom = null;

        var instance = {
            settings: {},
            save: function save() {
                return dataService.saveSettings({
                    TriggerConfigurations: {
                        'Status Actions': dataService.getDraftSettings().TriggerConfigurations['Status Actions'],
                        'Location Based Sharing': dataService.getDraftSettings().TriggerConfigurations['Location Based Sharing'],
                        'User Locations': dataService.getDraftSettings().TriggerConfigurations['User Locations'],
                        'Enable workorder parent sharing': dataService.getDraftSettings().TriggerConfigurations['Enable workorder parent sharing'],
                        'Enable account parent sharing': dataService.getDraftSettings().TriggerConfigurations['Enable account parent sharing'],
                        'Enable opportunity parent sharing': dataService.getDraftSettings().TriggerConfigurations['Enable opportunity parent sharing'],
                        'Enable asset parent sharing': dataService.getDraftSettings().TriggerConfigurations['Enable asset parent sharing'],
                        'Allow follow': dataService.getDraftSettings().TriggerConfigurations['Allow follow'],
                        'Edit Sharing For Crew Members': dataService.getDraftSettings().TriggerConfigurations['Edit Sharing For Crew Members']

                    },
                    Synchronize: {
                        'ServiceAppointment': dataService.getDraftSettings().Synchronize['ServiceAppointment'],
                        'ResourceAbsence': dataService.getDraftSettings().Synchronize['ResourceAbsence']
                    },
                    // need all 3 for automators to save
                    AutomatorConfig: dataService.getAutomatorsMap('Sched008_TimePhaseSharing'),
                    DeletedAutomators: dataService.getDraftSettings().DeletedAutomators,
                    Territories: dataService.getDraftSettings().Territories,
                    manyTerritories: dataService.getDraftSettings().manyTerritories
                });
            },
            restore: function restore() {
                return dataService.restoreDefaultSettings({
                    TriggerConfigurations: {
                        'Status Actions': {},
                        'Location Based Sharing': {},
                        'User Locations': {},
                        'Enable workorder parent sharing': {},
                        'Enable account parent sharing': {},
                        'Enable opportunity parent sharing': {},
                        'Enable asset parent sharing': {},
                        'Allow follow': {},
                        'Edit Sharing For Crew Members': {},
                        'Update AR when service is reassigned': {},
                        'Update AR when service is dispatched': {}
                    },
                    Synchronize: {},
                    RestoreAutomatorSettings: ['Sched008_TimePhaseSharing']
                });
            },
            loadData: function loadData() {
                if (prom) return prom;

                prom = settingsUtils.callRemoteAction(remoteActions.sharingLoadData).then(function (res) {
                    instance.settings = res;
                });

                return prom;
            }
        };

        return instance;
    }
})();
'use strict';

(function () {

    angular.module('SettingsApp').directive('sharingUserTerritories', sharingUserTerritories);

    sharingUserTerritories.$inject = ['sharingService'];

    function sharingUserTerritories(sharingService) {

        controllerFunction.$inject = ['$scope'];

        function controllerFunction($scope) {
            $scope.verifyFunctions.push(function () {
                return console.log('verify - sharingUserTerritories');
            });
            $scope.sharingService = sharingService;
        }

        var template = '\n        <div class="pWrapper">\n            \n            Assign users a <a target="_blank" ng-href="../{{sharingService.settings.UserTerritoriesPreFix}}">user territory</a> record for each service territory where they work.\n            <br/> \n            User territory records give users Apex rule-based access to the following records:\n            <br/>\n            <ul class="slds-list_dotted">\n                <li>The related service territory</li>\n                <li>The territory\u2019s service territory members and their assigned resource records</li>\n                <li>Related service appointments</li>\n                <li>Related resource absences</li>\n            </ul>\n\n            Sharing is only applicable for private records.\n        </div>\n        ';

        return {
            restrict: 'E',
            scope: {
                verifyFunctions: '='
            },
            controller: controllerFunction,
            template: template
        };
    }
})();
'use strict';

(function () {

    angular.module('UIDirectives', []).directive('fslDatePicker', function () {
        return function (scope, element, attributes, s) {

            var currDate = null;
            var currTimeZone = null;
            var clickCount = 0;

            scope.$watch(attributes.myModel, function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    currDate = newValue;
                    writeToInput();
                }
            });

            scope.$watch(attributes.timeZone, function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    currTimeZone = newValue;
                    writeToInput();
                }
            });

            var datePicker = $(element).datepicker({
                inline: true,
                isRTL: document.querySelector('html').getAttribute('dir') === 'rtl',
                onSelect: function onSelect(datetext, inst) {

                    if (inst._keyEvent) {
                        clickCount++;

                        if (clickCount % 2 === 0) return;
                    }

                    var date = datePicker.datepicker("getDate");
                    currDate = moment.tz({
                        year: date.getFullYear(),
                        month: date.getMonth(),
                        date: date.getDate(),
                        hours: date.getHours(),
                        minutes: date.getMinutes()

                    }, currTimeZone).tz('GMT');

                    scope.$eval(attributes.myModel + "=date", { date: currDate });

                    writeToInput();

                    scope.$apply();
                }
            });

            function writeToInput() {
                if (currTimeZone && currDate) element.val(currDate.tz(currTimeZone).format('ll'));
            }
        };
    });
})();