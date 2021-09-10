'use strict';

/*

    ResourceService
    The resource service keeps all stuff related to the resources and territories

 */

(function () {

    ResourcesAndTerritoriesService.$inject = ['$q', 'sfdcService'];

    angular.module('serviceExpert').factory('ResourcesAndTerritoriesService', ResourcesAndTerritoriesService);

    function ResourcesAndTerritoriesService($q, sfdcService) {

        // hold promises
        var deferredObjects = {
            territories: $q.defer(),
            resources: $q.defer(),
            operatingHours: $q.defer()
        },


        // active territories map
        _territories = {},


        // all territories
        allTerritories = {},


        // only without sharing territories
        withoutSharingTerritoriesIds = [],


        // resource map
        resources = {},


        // contractorResources array of Ids
        _contractorResources = [],


        // operating hours map
        operatingHours = {},


        // crew resources array of Ids
        _crewResources = {},
            _crewToResources = {};

        function getResources() {
            return resources;
        }

        function getOperatingHours() {
            return operatingHours;
        }

        function getCapacityBasedResources() {
            return _contractorResources;
        }

        function getCrewResources() {
            return _crewResources;
        }

        function getCrewToResources() {
            return _crewToResources;
        }

        // factory init - getting resources and territories
        function getResourceAndTerritories() {
            var resetFunction = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;


            var gotResourcesDeferred = $q.defer();

            sfdcService.GetResourcesAndTerritories().then(function (resourcesAndTerrtories) {

                if (resetFunction) {
                    resetFunction();
                }

                gotResourcesDeferred.resolve();

                var withoutSharingTerritoriesByIds = resourcesAndTerrtories.withoutSharingTerritories.reduce(function (obj, item) {
                    obj[item.Id] = item;
                    return obj;
                }, {});

                // get ALL territories
                resourcesAndTerrtories.territories.forEach(function (territory) {
                    if (territory.IsActive) {
                        _territories[territory.Id] = new ServiceTerritory(territory);

                        //get only without sharing territory ids (CFSL-1120)
                        _territories[territory.Id]['hasSharing'] = withoutSharingTerritoriesByIds[territory.Id] ? false : true;
                    }

                    allTerritories[territory.Id] = new ServiceTerritory(territory);
                });

                // get resources of loaded territories
                resourcesAndTerrtories.resources.forEach(function (resource) {
                    resources[resource.Id] = new ServiceResource(resource);

                    if (resources[resource.Id].isCapacityBased) _contractorResources.push(resource.Id);

                    if (resources[resource.Id].serviceCrew) {
                        _crewResources[resource.Id] = resource;
                        _crewToResources[resources[resource.Id].serviceCrew] = resource;
                    }
                });

                // get operating hours and timeslots of resources in loaded territories
                resourcesAndTerrtories.operatingHours.forEach(function (oph) {
                    operatingHours[oph.Id] = new OperatingHours(oph);
                });

                deferredObjects.territories.resolve(_territories);
                deferredObjects.resources.resolve(resources);
                deferredObjects.operatingHours.resolve(operatingHours);

                window.setSplashScreenTabDone('loading-territories');
            }).catch(function (ex) {
                gotResourcesDeferred.reject(ex);
                deferredObjects.resources.reject();
                deferredObjects.territories.reject();
                deferredObjects.operatingHours.reject();
                console.warn('GetResourcesAndTeritorries: unable to load resources, territories, or operating hours');
                bootstrap.handleError(ex);
            });

            return gotResourcesDeferred.promise;
        }

        // run when service loads
        getResourceAndTerritories();

        // this will reset the data, used when locations are loaded/unloaded
        function reset() {

            _territories = {};
            resources = {};
            operatingHours = {};
            _contractorResources = [];
            _crewResources = {};
            _crewToResources = {};
        }

        // This will be our resource factory
        return {
            promises: {
                territories: function territories() {
                    return deferredObjects.territories.promise;
                },
                resources: function resources() {
                    return deferredObjects.resources.promise;
                },
                operatingHours: function operatingHours() {
                    return deferredObjects.operatingHours.promise;
                }
            },
            territories: function territories() {
                return _territories;
            },
            allTerritories: allTerritories,
            getResources: getResources,
            operatingHours: operatingHours,
            getOperatingHours: getOperatingHours,
            getCapacityBasedResources: getCapacityBasedResources,
            getCrewResources: getCrewResources,
            getCrewToResources: getCrewToResources,
            contractorResources: function contractorResources() {
                return _contractorResources;
            },
            crewResources: function crewResources() {
                return _crewResources;
            },
            crewToResources: function crewToResources() {
                return _crewToResources;
            },
            getResourceAndTerritories: getResourceAndTerritories,
            reset: reset
        };
    }
})();