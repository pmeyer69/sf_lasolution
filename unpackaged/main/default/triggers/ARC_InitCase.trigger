trigger ARC_InitCase on Case (before insert) {

    for(Case cs :Trigger.New){

        if (cs.AccountId != NULL){
            List<Account> accList = [Select Id, FirstName, LastName, RecordTypeID, PersonContactID, a_Provenance_de_la_demande__c from Account where id = :cs.AccountId LIMIT 1];
            if(accList.get(0).RecordTypeID == '012090000011euXAAQ' || accList.get(0).RecordTypeID == '0121q000000D5CKAA0'){
                cs.ContactID = accList.get(0).PersonContactID;
            }
            if(accList.get(0).a_Provenance_de_la_demande__c == NULL){
                accList.get(0).a_Provenance_de_la_demande__c = cs.Origin;
            }
            update accList;
            if(cs.RecordTypeId == '0121q000000D5QcAAK'){
            cs.Subject = 'Demande de ' + accList.get(0).FirstName + ' ' + accList.get(0).LastName;}

        }

    }

}