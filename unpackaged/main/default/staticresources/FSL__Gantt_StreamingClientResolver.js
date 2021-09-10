'use strict';

(function () {

    StreamingClientResolverService.$inject = ['$q', 'StreamingAPIService', 'MstResolver', 'StateService', 'DeltaService'];

    angular.module('serviceExpert').factory('StreamingClientResolverService', StreamingClientResolverService);

    // this c'tor will function as our provider
    function StreamingClientResolverService($q, StreamingAPIService, MstResolver, StateService, DeltaService) {

        var latestCatchedEvent = -1;
        var StreamingChannels = ['ServicesTopic', 'AbsencesTopic', 'AssignedResourcesTopic', 'LivePositionsTopic', 'CapacitiesTopic', 'OptReqTopic', 'TimeDependencyTopic'];
        var REPLAY_FROM_KEY = 'replay';

        // connect to push server
        function connectToPush() {

            $.cometd.addListener('/meta/handshake', function (message) {
                if (message.successful) {
                    console.log('Handshake successful!');
                    registerAndSubscribeExtensions();
                    StateService.setStreamingActiveState(true);
                } else {
                    StateService.setStreamingActiveState(false);
                    console.warn('Handshake! error: ' + message.error);
                }
            });

            $.cometd.addListener('/meta/connect', function (message) {
                if (!message.successful) {
                    console.warn('disconnected! error: ' + message.error);
                    StateService.setStreamingActiveState(false);
                } else {
                    StateService.setStreamingActiveState(true);
                }
            });

            MstResolver.connectToPush();
        }

        function registerAndSubscribeExtensions() {

            try {

                // set replay ext
                for (var i = 0; i < StreamingChannels.length; i++) {

                    var extension = $.cometd.getExtension(StreamingChannels[i]);

                    if (!extension) {
                        registerToPush(StreamingChannels[i]);
                    }

                    $.cometd.subscribe('/topic/' + StreamingChannels[i], StreamingAPIService.HandleNotification);
                }
            } catch (ex) {
                console.log(ex);
            }
        }

        // register channel to push server
        function registerToPush(channel) {
            var currentChannel = '/topic/' + channel;
            var replayExtension = new cometdReplayExtension();
            replayExtension.setChannel(currentChannel);
            replayExtension.setReplay(-1);
            $.cometd.registerExtension(channel, replayExtension);
        }

        // init connect
        function initStreaming() {
            try {

                if (StateService.getStreamingActiveState() == true) {
                    connectToPush();
                } else {
                    MstResolver.connectToPush();
                }
            } catch (ex) {
                console.log(ex);
            }
        }

        return {
            initStreaming: initStreaming
        };
    }
})();