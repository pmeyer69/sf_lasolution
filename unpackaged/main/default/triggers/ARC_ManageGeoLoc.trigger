trigger ARC_ManageGeoLoc on ServiceAppointment (after update) {

	for(ServiceAppointment saOld :Trigger.Old){
		for(ServiceAppointment saNew :Trigger.New){

			if(saOld.Id == saNew.Id){
				if(saOld.Status != saNew.Status && saNew.Status == 'In Progress'){
					//Do start
					List<ServiceResource> sr = [Select Id, LastKnownLocation, LastKnownLatitude, LastKnownLongitude, LastKnownLocationDate from ServiceResource where RelatedRecordId = :saNew.LastModifiedById LIMIT 1];
                    ServiceAppointment sa = [Select Id, a_ActStartGeo__Latitude__s, a_EffStartUser__c, LastModifiedById, a_ActStartGeo__Longitude__s, a_ActStartGeoTimestamp__c, a_ActStartLat__c, a_ActStartLong__c from ServiceAppointment where Id = :saNew.Id LIMIT 1];
                  	sa.a_EffStartUser__c = saNew.LastModifiedById;
                    if(sr.Size() != 0){
           	        	sa.a_ActStartGeo__Latitude__s = sr.get(0).LastKnownLatitude;
                    	sa.a_ActStartGeo__Longitude__s = sr.get(0).LastKnownLongitude;
						sa.a_ActStartGeoTimestamp__c = sr.get(0).LastKnownLocationDate;
                    	sa.a_ActStartLat__c = sr.get(0).LastKnownLatitude;
						sa.a_ActStartLong__c = sr.get(0).LastKnownLongitude;
                    }
                    update sa;
				}
				if(saOld.Status != saNew.Status && saNew.Status == 'Completed'){
					//Do end
					List<ServiceResource> sr = [Select Id, LastKnownLocation, LastKnownLatitude, LastKnownLongitude, LastKnownLocationDate from ServiceResource where RelatedRecordId = :saNew.LastModifiedById LIMIT 1];
                    ServiceAppointment sa = [Select Id, a_ActEndGeo__Latitude__s, a_EffEndUser__c, LastModifiedById, a_ActEndGeo__Longitude__s, a_ActEndGeoTimestamp__c, a_ActEndLat__c, a_ActEndLong__c from ServiceAppointment where Id = :saNew.Id LIMIT 1];
					sa.a_EffEndUser__c = saNew.LastModifiedById;
                    if(sr.Size() != 0){
	                    sa.a_ActEndGeo__Latitude__s = sr.get(0).LastKnownLatitude;
    	                sa.a_ActEndGeo__Longitude__s = sr.get(0).LastKnownLongitude;
						sa.a_ActEndGeoTimestamp__c = sr.get(0).LastKnownLocationDate;
            	        sa.a_ActEndLat__c = sr.get(0).LastKnownLatitude;
						sa.a_ActEndLong__c = sr.get(0).LastKnownLongitude;
                    }
                    update sa;
				}
			}
		}
	}
}