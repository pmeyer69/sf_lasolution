'use strict';

(function () {

    RegisterService.$inject = ['DeltaService', 'StreamingAPIService'];

    angular.module('serviceExpert').factory('RegisterService', RegisterService);

    function RegisterService(DeltaService, StreamingAPIService) {

        // register for updates
        function register(type, callback) {
            DeltaService.register(type, callback);
            StreamingAPIService.register(type, callback);
        }

        function unRegister(type, callback) {
            DeltaService.unRegister(type, callback);
            StreamingAPIService.unRegister(type, callback);
        }

        return {
            register: register,
            unRegister: unRegister
        };
    }
})();