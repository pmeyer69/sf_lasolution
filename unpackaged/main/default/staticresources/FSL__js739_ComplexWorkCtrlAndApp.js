(function() {

    angular.module('ComplexWork',['MstResolver']).config(['MstResolverProvider', function(MstResolverProvider) {

        MstResolverProvider.setConfig({
            fslOperationRemoteAction: complex.remoteActions.getFslOperation,
            getAsyncApexJobRemoteAction: complex.remoteActions.getAsyncApexJob,
            apiVersion: '41.0',
            fieldNames: complex.fieldNames.FslOperationFieldNames,
            autoConnect: true
        });

    }]);

    mainCtrl.$inject = ['$scope', 'superService', 'TIME_DEP_FIELDS', '$q', 'MstResolver'];

    angular.module('ComplexWork').controller('mainCtrl', mainCtrl);

    function mainCtrl($scope, superService, TIME_DEP_FIELDS, $q, MstResolver) {

        $scope.schedulingProgress = [];

        // check if we open this page from the gantts lightbox
        $scope.inGantt = (window.document.location.href.indexOf('ingantt') > -1);

        $scope.newServicesSelected = {
            sa1: null,
            sa2: null
        };

        $scope.selectCurrentInLb = function() {

            if ($scope.relatedServices.byAccount) {
                for (let i = 0; i < $scope.relatedServices.byAccount.length; i++) {
                    if ($scope.relatedServices.byAccount[i].Id === complex.serviceId) {
                        $scope.newServicesSelected[$scope.selectNewService] = $scope.relatedServices.byAccount[i];
                        break;
                    }
                }
            }

            if ($scope.relatedServices.byWorkorder) {
                for (let i = 0; i < $scope.relatedServices.byWorkorder.length; i++) {
                    if ($scope.relatedServices.byWorkorder[i].Id === complex.serviceId) {
                        $scope.newServicesSelected[$scope.selectNewService] = $scope.relatedServices.byWorkorder[i];
                        break;
                    }
                }
            }

            if ($scope.relatedServices.byWoli) {
                for (let i=0; i<$scope.relatedServices.byWoli.length; i++) {
                    if ($scope.relatedServices.byWoli[i].Id === complex.serviceId) {
                        $scope.newServicesSelected[$scope.selectNewService] = $scope.relatedServices.byWoli[i];
                        break;
                    }
                }
            }

            $scope.selectNewService = null;
        };

        $scope.serviceId = window.complex.serviceId
        $scope.schedulingFinished = false;
        $scope.timeDepSelect = "Same Start";
        $scope.sameResource = false;
        $scope.savingDependency = false;
        $scope.removingDependency = false;
        $scope.selectNewService = null;
        $scope.fields = [];
        $scope.statusTranslations = complex.statusTranslations;
        $scope.showServiceLightbox = {
            id: null,
            name: null
        };
        $scope.chain = {};
        $scope.relatedServices = {
            byAccount: null,
            byWorkorder: null,
            byWoli: null,

        };

        $scope.serviceIdToName = {};
        $scope.chainOrderFiltered = [];
        $scope.chainOrder = [];
        $scope.schedulingResultsMap = {};

        $scope.showBy = 'byWorkorder';
        $scope.saPage = document.location.href.indexOf('servlet') > -1 ? '../apex/' + complex.serviceLightboxUrl : complex.serviceLightboxUrl;

        $scope.recenterGraph = superService.recenterGraph;

        $scope.isInChain = function (id) {
            return superService.checkIfServicesInChain($scope.chain, id, id);
        };

        $scope.isScheduleRunning = function() {
            return schedulingRunning;
        };

        var assignedResources = {},
            removeRunning = false,
            addRunning = false,
            schedulingRunning = false;


        // init - get related services to the current service
        window.complex.serviceId && superService.getRelatedServices()
            .then(function(services) {
                $scope.relatedServices.byAccount = services.account;
                $scope.relatedServices.byWorkorder = services.workorder;
                $scope.relatedServices.byWoli = services.wolis || null;

                $scope.showBy = $scope.relatedServices['byAccount'].length > 0 ? 'byAccount' : 'byWorkorder';
            })
            .catch(handleError);


        // init - get SA fieldsets
        window.complex.serviceId && superService.getFieldsets()
            .then(function(fields) {
                $scope.fields = fields.filter(field => field.APIName.indexOf('.') == -1); //fields;
            })
            .catch(handleError);


        // init - get chain
        window.complex.serviceId && superService.getMstChain().then(generateChainData).catch(handleError);


        // validate before adding new time dep
        function validateTimeDependency(dep, same) {

            // already running
            if (addRunning) {
                return false;
            } else {
                addRunning = true;
            }


            // schedule running
            if (schedulingRunning) {
                alert(complex.labels.Please22);
                addRunning = false;
                return false;
            }

            // need 2 services
            if (!$scope.newServicesSelected.sa1 || !$scope.newServicesSelected.sa2) {
                alert(complex.labels.Please33);
                addRunning = false;
                return false;
            }

            // same service was chosen
            if ($scope.newServicesSelected.sa1 == $scope.newServicesSelected.sa2) {
                alert(complex.labels.Please77);
                addRunning = false;
                return false;
            }

            // chain is empty, one of the service must be current
            if ($scope.isChainEmpty() && $scope.newServicesSelected.sa1.Id !== complex.serviceId && $scope.newServicesSelected.sa2.Id !== complex.serviceId) {
                alert(complex.labels.Please11);
                addRunning = false;
                return false;
            }

            // one of the services is not in the chain
            if (!$scope.isChainEmpty() && !superService.checkIfServicesInChain($scope.chain, $scope.newServicesSelected.sa1.Id, $scope.newServicesSelected.sa2.Id)) {
                alert(complex.labels.Please00);
                addRunning = false;
                return false;
            }

            // dep is none but not same
            if (!same && dep === 'None') {
                alert(complex.labels.Please99);
                addRunning = false;
                return false;
            }


            // same start and same resource
            if (same && dep === 'Same Start') {
                alert(complex.labels.Please44);
                addRunning = false;
                return false;
            }

            return true;

        }


        // add new time dep to the chain
        $scope.addTimeDependency = function(sa1, sa2, dep, same) {

            if (!validateTimeDependency(dep, same)) {
                return;
            }

            dep = dep === 'None' ? null : dep;

            $scope.savingDependency = true;

                superService.addTimeDependency(sa1, sa2, dep, same)
                .then(generateChainData)
                .then(function() {
                    $scope.newServicesSelected.sa1 = null;
                    $scope.newServicesSelected.sa2 = null;
                })
                .finally(function() {
                    addRunning = false;
                    $scope.savingDependency = false;
                })
                .catch(handleError)
        };


        // remove time dependency
        $scope.removeTimeDependency = function(depId) {

            // schedule running
            if (schedulingRunning) {
                alert(complex.labels.Please22);
                return;
            }


            if (removeRunning) {
                return;
            } else {
                removeRunning = true;
            }

            if (!confirm(complex.labels.confirmComplex)) {
                removeRunning = false;
                return;
            }

            $scope.removingDependency = true;

            superService.removeTimeDependency(depId)
                .then(generateChainData)
                .finally(function() {
                    removeRunning = false;
                    $scope.removingDependency = false;
                })
                .catch(handleError)
        };


        // basic error handling function
        function handleError(error) {
            alert(error.message);
            console.error(error);
        }


        // generate chain data to Angular from SF object
        function generateChainData(result) {

            let chain = result.dependencies || [];


            // generate assigned resource object
            if (result.assignedResources) {
                result.assignedResources.forEach(function(ar) {
                    if (ar.ServiceResource) {
                        assignedResources[ar.ServiceAppointmentId] = ar.ServiceResource.Name;
                    }
                });
            }

            $scope.chain = {};
            $scope.serviceIdToName = {};

            // create the parsed dependency array
            chain.forEach(function(dep) {

                $scope.chain[dep[TIME_DEP_FIELDS().sa1]] = $scope.chain[dep[TIME_DEP_FIELDS().sa1]] ||
                    {
                        id:             dep[TIME_DEP_FIELDS().sa1r].Id,
                        name:           dep[TIME_DEP_FIELDS().sa1r].AppointmentNumber,
                        relations:      [],
                        isScheduled:    !!dep[TIME_DEP_FIELDS().sa1r].SchedStartTime,
                        start:          dep[TIME_DEP_FIELDS().sa1r].SchedStartTime ? dep[TIME_DEP_FIELDS().sa1r].SchedStartTime : '',
                        status:         $scope.statusTranslations[dep[TIME_DEP_FIELDS().sa1r].Status.decodeHTML()],
                        statusCategory: dep[TIME_DEP_FIELDS().sa1r].StatusCategory
                    };

                $scope.chain[dep[TIME_DEP_FIELDS().sa1]].relations.push(
                    {
                        relationId:     dep.Id,
                        id:             dep[TIME_DEP_FIELDS().sa2],
                        name:           dep[TIME_DEP_FIELDS().sa2r].AppointmentNumber,
                        dependency:     dep[TIME_DEP_FIELDS().dependency],
                        sameResource:   dep[TIME_DEP_FIELDS().sameResource],
                        isScheduled:    !!dep[TIME_DEP_FIELDS().sa2r].SchedStartTime,
                        start:          dep[TIME_DEP_FIELDS().sa2r].SchedStartTime ? dep[TIME_DEP_FIELDS().sa2r].SchedStartTime : '',
                        status:         $scope.statusTranslations[dep[TIME_DEP_FIELDS().sa2r].Status.decodeHTML()],
                        statusCategory: dep[TIME_DEP_FIELDS().sa2r].StatusCategory
                    }
                );

                if (dep[TIME_DEP_FIELDS().sa1r]) {
                    $scope.serviceIdToName[dep[TIME_DEP_FIELDS().sa1r].Id]= dep[TIME_DEP_FIELDS().sa1r].AppointmentNumber;
                }

                if (dep[TIME_DEP_FIELDS().sa2r]) {
                    $scope.serviceIdToName[dep[TIME_DEP_FIELDS().sa2r].Id] = dep[TIME_DEP_FIELDS().sa2r].AppointmentNumber;
                }

            });

            updateGraph();
        }


        // updates the nomnoml graph
        function updateGraph() {
            superService.drawGraph(superService.formatGraph($scope.chain, assignedResources));
        }


        // timezone convertion
        $scope.formatFieldToDisplay = function (value, field, service) {

            if (field.Type.indexOf('DATE') > -1) {
                return moment(value).tz(complex.timeZone).format('lll');
            }
            else if (field.APIName == 'Status') {
                return $scope.statusTranslations[value.decodeHTML()] || value.decodeHTML();
            }
            
            if (field.Type == 'STRING' || field.Type == 'TEXTAREA' || field.Type == 'PICKLIST') {
                if (value)
                    value.decodeHTML();
            }

            if (field.Type == 'REFERENCE') {

                let path = field.SOQLString.split('.');

                path[1] = path[1].charAt(0).toUpperCase() + path[1].slice(1);

                if (!service[path[0]]) {
                    return null;
                }

                return service[path[0]][path[1]].decodeHTML();
            } else {
                return value;
            }

        };


        // is chain empty
        $scope.isChainEmpty = function() {
            return Object.keys($scope.chain).length === 0;
        };


        // schedule by order
        $scope.scheduleByOrder = function() {

            if (schedulingRunning || $scope.removingDependency || $scope.savingDependency) {
                return;
            }

            schedulingRunning = true;

            superService.getTreeOrderForScheduling()
                .then(function(order) {

                    $scope.chainOrder = order;
                    $scope.chainOrderFiltered = order.filter(service => {

                        if ($scope.chain[service.ServiceId]) {

                            if (shouldFilterSecondServiceOfConsecutiveWork($scope.chain[service.ServiceId])) {
                                return false;
                            }

                        }

                        return true;

                    });

                    $scope.schedulingResultsMap = {};
                    startScheduling($scope.chainOrderFiltered);
                })
                .finally(function() {
                    // nothing for now
                })
                .catch(handleError);
        };

        function shouldFilterSecondServiceOfConsecutiveWork(service) {

            for (let i=0; i<service.relations.length; i++) {
                if (service.relations[i].dependency === 'Immediately Follow') {
                    return true;
                }
            }

            return false;

        }

        $scope.displayScheduleResult = function(scheduleResult) {

            return complex.labels.ComplexScheduledTo.replace('$0', scheduleResult.Resource.Name).replace('$1', moment(scheduleResult.Service.SchedStartTime).tz(complex.timeZone).format('lll'));

            // if (scheduleResult.result) {
            //
            //     if (Array.isArray(scheduleResult.result) && scheduleResult.result.length === 0) {
            //         return complex.labels.ComplexNoCandidates
            //     } else if (Array.isArray(scheduleResult.result) && scheduleResult.result[0]) {
            //         return complex.labels.ComplexScheduledTo.replace('$0', scheduleResult.result[0].Resource.Name).replace('$1', moment(scheduleResult.result[0].Service.SchedStartTime).tz(complex.timeZone).format('lll'));
            //     } else {
            //         return scheduleResult.result;
            //     }
            // }

        };


        function startScheduling(order) {

            var currentService = 0,
                isComplexSchedulingAvailable = false;

            // init promises
            order.forEach(function(o) { o.promise = $q.defer(); });

            $scope.schedulingProgress = [];
            $scope.servicesFilteredOutByConsecutive = [];
            $scope.schedulingFinished = true;


            // start scheduling
            scheduleRecursive();

            function scheduleRecursive() {

                if (order.length === currentService) {
                    superService.getMstChain().then(generateChainData).catch(handleError);
                    schedulingRunning = false;
                    return;
                }

                let length = $scope.schedulingProgress.push({
                    service: order[currentService],
                    result: null,
                    error: false,
                    scheduling: true
                });

                superService.scheduleService(order[currentService].ServiceId)
                    .then(function(schedulingResult) {

                        console.log(schedulingResult);

                        if (Array.isArray(schedulingResult) && schedulingResult[0] && schedulingResult[0].LongOperationId) {

                            isComplexSchedulingAvailable = true;

                            MstResolver.getUpdates(schedulingResult[0].LongOperationId).then(function(schedulingResult) {
                                console.log(schedulingResult);
                                parseFslOperationResult(schedulingResult.fslOperation.result);
                            }).catch(ex => {

                                console.error(ex);
                                console.log(order[currentService]);

                                $scope.schedulingProgress[$scope.schedulingProgress.length-1] = {
                                    service: order[currentService],
                                    result: ex,
                                    error: true,
                                    scheduling: false
                                };

                            }).finally(() => {
                                scheduleRecursive(++currentService);
                            });

                        }

                        $scope.schedulingProgress[length-1].result = schedulingResult;

                        schedulingResult.forEach(result => {
                            $scope.schedulingResultsMap[result.Service.Id] = result;
                        });

                    })
                    .finally(function() {

                        if (isComplexSchedulingAvailable) {
                            return;
                        }

                        $scope.schedulingProgress[length-1].scheduling = false;
                        scheduleRecursive(++currentService);
                    })
                    .catch(ex => {
                        //handleError(ex);
                        $scope.schedulingProgress[length-1].result = ex.message;
                        $scope.schedulingProgress[length-1].error = true;
                    });

            }

        }


        function parseFslOperationResult(result) {

            $scope.schedulingProgress = [];

            result.forEach(result => {
                $scope.schedulingProgress.push({
                    service: result.Service,
                    result: [result],
                    error: false,
                    scheduling: false
                });
            });

        }


        let wasSameResource = false;
        $scope.$watch('timeDepSelect', function(newValue, oldValue) {

            if (oldValue !== 'Immediately Follow') {
                wasSameResource = $scope.sameResource;
            }

            if (newValue === 'Immediately Follow') {
                $scope.sameResource = true;
            } else {
                $scope.sameResource = wasSameResource;
            }

        });






    }




}());