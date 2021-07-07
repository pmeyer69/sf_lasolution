'use strict';

(function () {

    SkillsService.$inject = ['$q', 'sfdcService', 'ResourcesAndTerritoriesService'];

    angular.module('serviceExpert').factory('SkillsService', SkillsService);

    function SkillsService($q, sfdcService, ResourcesAndTerritoriesService) {

        var skills = [],
            defferedObjects = {
            skills: $q.defer()
        };

        // get skills
        function getSkillsFromSfdc() {

            var def = $q.defer();

            sfdcService.callRemoteAction(RemoteActions.getSkills).then(function (sfdcSkills) {

                skills = sfdcSkills;
                def.resolve(def);
                defferedObjects.skills.resolve(skills);
            }).catch(function (ex) {
                def.reject(def);
                defferedObjects.skills.reject(ex);
                console.log(ex);
                console.warn('unable to get skill list');
            });

            return def.promise;
        }

        // does a resource has all given skills? (AND OPERATOR)
        function doesHaveSkills(resourceId, skillIds) {
            var startDate = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
            var endDate = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;


            var resource = ResourcesAndTerritoriesService.getResources()[resourceId];

            if (!Array.isArray(skillIds)) {
                skillIds = [skillIds];
            }

            for (var i = 0, length = skillIds.length; i < length; i++) {

                if (resource.skills[skillIds[i]]) {

                    // skill found but doesn't intersect
                    if (startDate && endDate && !isIntersect(startDate, endDate, resource.skills[skillIds[i]].effectiveStartDate, resource.skills[skillIds[i]].effectiveEndDate)) {
                        return false;
                    }
                }

                // skill not found
                else {
                        return false;
                    }
            }

            // all skilss were found
            return true;
        }

        // does a resource has all given skills? (OR OPERATOR)
        function doesHaveSomeSkills(resourceId, skillIds) {
            var startDate = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
            var endDate = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;


            var resource = ResourcesAndTerritoriesService.getResources()[resourceId];

            if (!Array.isArray(skillIds)) {
                skillIds = [skillIds];
            }

            for (var i = 0, length = skillIds.length; i < length; i++) {

                if (resource.skills[skillIds[i]]) {

                    // skill found and intersect
                    if (startDate && endDate && isIntersect(startDate, endDate, resource.skills[skillIds[i]].effectiveStartDate, resource.skills[skillIds[i]].effectiveEndDate)) {
                        return true;
                    }
                }
            }

            return false;
        }

        // This will be our state
        return {
            getSkills: function getSkills() {
                return skills;
            },
            doesHaveSkills: doesHaveSkills,
            doesHaveSomeSkills: doesHaveSomeSkills,
            getSkillsFromSfdc: getSkillsFromSfdc,
            promises: {
                skills: function skills() {
                    return defferedObjects.skills.promise;
                }
            }
        };
    }
})();