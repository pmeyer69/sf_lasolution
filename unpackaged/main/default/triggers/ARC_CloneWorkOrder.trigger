trigger ARC_CloneWorkOrder on WorkOrder (after update) {

//Testing cloning

for(WorkOrder woNew :Trigger.New){
for(WorkOrder woOld :Trigger.Old){
if(woNew.Id == woOld.Id && woOld.ZTriggerClone__c == FALSE && woNew.ZTriggerClone__c == TRUE){

WorkOrder myNewClone = woNew.clone(false, false, false, false);
myNewClone.RecordTypeId = [Select Id from RecordType where DeveloperName = 'Intervention'].Id;
myNewClone.Patient__c = NULL;
myNewClone.a_Prestation__c = woNew.Id;
myNewClone.Dossier_de_prise_en_charge__c = NULL;
insert myNewClone;
//Remove Skills
List<SkillRequirement> DelSkillList = [Select Id from SkillRequirement where RelatedRecordId = :myNewClone.Id];
delete DelSkillList;


//Copy Skills
List<SkillRequirement> newSkillList = new List<SkillRequirement>();
List<SkillRequirement> skillList = [Select LastReferencedDate, RelatedRecordId, LastViewedDate, SkillId, SkillLevel, SkillNumber from SkillRequirement where RelatedRecordId = :woNew.Id];
for(SkillRequirement sr :skillList){

SkillRequirement newSr = sr.clone(false, false, false, false);
newSr.RelatedRecordId = myNewClone.Id;
newSkillList.add(newSr);
}
Insert newSkillList;
ARC_ManageRecurrences.updateAPP(myNewClone.Id);

}

}

}

}