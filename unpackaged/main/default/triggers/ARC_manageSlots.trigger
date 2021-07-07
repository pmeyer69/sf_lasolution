trigger ARC_manageSlots on WorkOrder (before update) {

for(WorkOrder woOld :Trigger.Old){
for(WorkOrder woNew :Trigger.New){

if(woOld.Id == woNew.Id && woOld.a_Slot__c != woNew.a_Slot__c){
if(woNew.a_Slot__c == NULL){
Id TempNullId = NULL;
woNew.FSL__VisitingHours__c = TempNullId;

}
else{

Id myVisHours = [Select Id, Operating_hours__c, Slot_prestation__c from Slots_to_Visiting_hours__c where Slot_prestation__c = :woNew.a_Slot__c LIMIT 1
].Operating_hours__c;
woNew.FSL__VisitingHours__c = myVisHours;

}

}

}
}

}