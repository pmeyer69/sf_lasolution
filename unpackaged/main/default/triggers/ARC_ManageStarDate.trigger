trigger ARC_ManageStarDate on WorkOrder (before insert, before update) {

	Id myRecType = [Select Id from RecordType where DeveloperName = 'Intervention'].Id;
    
    if(Trigger.IsInsert){
		for(WorkOrder wo :Trigger.New){
			if(wo.RecordTypeId != myRecType){
				if(wo.a_Jour_heure_premiere_prest__c != NULL){
					wo.a_Forcer_heure_slectionnee__c = TRUE;
					wo.StartDate = wo.a_Jour_heure_premiere_prest__c;
                    wo.a_Recurrence_valide_du__c = wo.a_Jour_heure_premiere_prest__c.date();
				}
				if(wo.a_Premiere_prestation_le__c != NULL){
					wo.StartDate = DateTime.newInstance(wo.a_Premiere_prestation_le__c.Year(), wo.a_Premiere_prestation_le__c.Month(), wo.a_Premiere_prestation_le__c.Day());
					wo.a_Forcer_heure_slectionnee__c = FALSE;
                    wo.a_Recurrence_valide_du__c = wo.a_Premiere_prestation_le__c;
				}
			}
    	}
	}
    if(Trigger.IsUpdate){
        for(WorkOrder wo :Trigger.New){
            for(WorkOrder woOld :Trigger.Old){
                if(wo.RecordTypeId != myRecType && wo.Id == woOld.Id && (wo.a_Jour_heure_premiere_prest__c != woOld.a_Jour_heure_premiere_prest__c || wo.a_Premiere_prestation_le__c != woOld.a_Premiere_prestation_le__c)){
                    wo.a_Derniere_fois_planifie_le__c = NULL;
                    if(wo.a_Jour_heure_premiere_prest__c != NULL){
						wo.a_Forcer_heure_slectionnee__c = TRUE;
						wo.StartDate = wo.a_Jour_heure_premiere_prest__c;
                    	wo.a_Recurrence_valide_du__c = wo.a_Jour_heure_premiere_prest__c.date();                        
					}
					if(wo.a_Premiere_prestation_le__c != NULL){
						wo.StartDate = DateTime.newInstance(wo.a_Premiere_prestation_le__c.Year(), wo.a_Premiere_prestation_le__c.Month(), wo.a_Premiere_prestation_le__c.Day());
						wo.a_Forcer_heure_slectionnee__c = FALSE;
                        wo.a_Recurrence_valide_du__c = wo.a_Premiere_prestation_le__c;
					}
                    
                }
            }
        }
    }
}