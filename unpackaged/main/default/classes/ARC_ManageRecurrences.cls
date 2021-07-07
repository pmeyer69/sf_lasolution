public class ARC_ManageRecurrences {
    
    public static void updateApp (String workorderId){
        
        List<ServiceAppointment> AppList = [Select Id, DurationType, ArrivalWindowStartTime, ArrivalWindowEndTime, DueDate, a_Patient__c, AccountId from ServiceAppointment where ParentRecordId = :workorderId];
        List<WorkOrder> woList = [Select Id, a_Derniere_fois_planifie_le__c, a_Forcer_heure_slectionnee__c from WorkOrder where Id = :workorderId];
        if(AppList.Size() != 0 && woList.Size() != 0){
            
            //manage visit window dates
            if(woList.get(0).a_Forcer_heure_slectionnee__c){
                AppList.get(0).ArrivalWindowStartTime = woList.get(0).a_Derniere_fois_planifie_le__c;
                //Integer myMinutes = 0;
                //if(woList.get(0).DurationType == 'Minutes') {myMinutes = Integer.valueOf(woList.get(0).Duration);}
                //if(woList.get(0).DurationType == 'Hours') {myMinutes = Integer.valueOf(woList.get(0).Duration*60);}
                //AppList.get(0).ArrivalWindowEndTime = woList.get(0).a_Derniere_fois_planifie_le__c.addminutes(myMinutes);
                AppList.get(0).ArrivalWindowEndTime = woList.get(0).a_Derniere_fois_planifie_le__c;
            }
            else{
                AppList.get(0).ArrivalWindowStartTime = DateTime.newInstance(woList.get(0).a_Derniere_fois_planifie_le__c.Year(), woList.get(0).a_Derniere_fois_planifie_le__c.Month(), woList.get(0).a_Derniere_fois_planifie_le__c.Day());
                AppList.get(0).ArrivalWindowEndTime = AppList.get(0).ArrivalWindowStartTime.adddays(1);
                AppList.get(0).ArrivalWindowEndTime = AppList.get(0).ArrivalWindowEndTime.addminutes(-1);
            }
            AppList.get(0).DueDate = AppList.get(0).ArrivalWindowStartTime.adddays(7);
            appList.get(0).a_Patient__c = appList.get(0).AccountId;
            update AppList;
            
        }
    }


    
    @InvocableMethod
    public static void FlowInterface (List<String> woIdList){
        for(String idel :woIdList){
            ARC_ManageRecurrences.createRecurence(idel);
        }
        
    }
    
    public static DateTime nextWeekdayCandidate (DateTime NextCandidate, String WeekDays, Boolean isInitMode){
        List<Integer> myWeekDays = new List<Integer>();
        List<String> tempWeekDays = new List<String>();
        tempWeekDays.addAll(WeekDays.split(';'));
        for(String tm :tempWeekDays){
            myWeekDays.add(Integer.ValueOf(tm));
        }
        myweekDays.sort();
        Integer CandWeekDay = Math.mod(Date.newInstance(1900, 1, 1).daysBetween(NextCandidate.date()), 7) + 1;
        Integer daysToAdd = 0;
        Boolean stopFlag = TRUE;
        for(Integer mwd :myWeekDays){
            if((mwd > CandWeekDay && stopFlag && !isInitMode) || (mwd >= CandWeekDay && stopFlag && isInitMode)){daysToAdd = mwd - candWeekDay; stopFlag = FALSE;}
            else{//to manage the situation the Prestation has only one weekday selected
                if((mwd == CandWeekDay && stopFlag && !isInitMode)){daysToAdd = 7; stopFlag = FALSE;}
            }
        }
        for(Integer mwd :myWeekDays){
            if((mwd < CandWeekDay && stopFlag && !isInitMode) || (mwd <= CandWeekDay && stopFlag && isInitMode)){daysToAdd = mwd - candWeekDay + 7; stopFlag = FALSE;}
        }
        Return NextCandidate.addDays(daysToAdd);
    }
    
    public static void createRecurence (String workorderId){
        //in later version: check the correct record type
        Id myRecordTypeId = [Select Id from RecordType where DeveloperName = 'Intervention'].Id;
        WorkOrder SourceWO = [Select Id, ZTriggerClone__c, StartDate, Status, a_Derniere_fois_planifie_le__c, a_Forcer_heure_slectionnee__c, a_Frequence__c, a_Jours_de_semaine__c, 
                              a_Prochaine_planification_le__c, a_Recurrence_valide_au__c, a_Recurrence_valide_du__c, a_Type_de_frequence__c, a_Type_de_recurrence__c from WorkOrder where Id = :workorderId LIMIT 1];
        
        Integer PlanningHorizon = 8;
        DateTime NextRecCandidate = DateTime.now();
        //if (sourceWO.a_Derniere_fois_planifie_le__c == NULL){sourceWO.a_Derniere_fois_planifie_le__c = sourceWO.StartDate;}
        //if(sourceWO.a_Prochaine_planification_le__c == NULL){sourceWO.a_Prochaine_planification_le__c = Date.Today();}
        if (sourceWO.a_Derniere_fois_planifie_le__c == NULL){NextRecCandidate = sourceWO.StartDate;}
        if(sourceWO.a_Prochaine_planification_le__c == NULL){sourceWO.a_Prochaine_planification_le__c = Date.Today();}
        sourceWO.a_Prochaine_planification_le__c = sourceWO.a_Prochaine_planification_le__c.addDays(PlanningHorizon);
        Integer Freq = 0;
        if(sourceWO.a_Frequence__c != NULL){Freq = Integer.valueOf(sourceWO.a_Frequence__c);}
        //while (sourceWO.a_Recurrence_valide_au__c >= sourceWO.a_Derniere_fois_planifie_le__c && sourceWO.a_Prochaine_planification_le__c >= sourceWO.a_Derniere_fois_planifie_le__c ){
        while (sourceWO.Status == 'In Progress' && sourceWO.a_Recurrence_valide_au__c >= NextRecCandidate && sourceWO.a_Prochaine_planification_le__c >= NextRecCandidate && sourceWO.a_Recurrence_valide_du__c <= (NextRecCandidate +5)){    
            //Calculate next recurence
            
            if(sourceWO.a_Type_de_recurrence__c == 'Fréquence et type de fréquence' && sourceWO.a_Derniere_fois_planifie_le__c != NULL){
                Switch on sourceWO.a_Type_de_frequence__c{
                    when 'Jours' {
                        NextRecCandidate = sourceWO.a_Derniere_fois_planifie_le__c.addDays(Freq);
                    }
                    when 'Semaines'{
                        NextRecCandidate = sourceWO.a_Derniere_fois_planifie_le__c.addDays(Freq*7);
                    }
                    when 'Mois'{
                        NextRecCandidate = sourceWO.a_Derniere_fois_planifie_le__c.addMonths(Freq);
                    }
                }
            }
            //add condition on weekdays here Jours de la semaine
            if(sourceWO.a_Type_de_recurrence__c == 'Jours de la semaine' && sourceWO.a_Derniere_fois_planifie_le__c != NULL){
                NextRecCandidate = ARC_ManageRecurrences.nextWeekdayCandidate(sourceWO.a_Derniere_fois_planifie_le__c, sourceWO.a_Jours_de_semaine__c, FALSE );
            }
            if(sourceWO.a_Type_de_recurrence__c == 'Jours de la semaine' && sourceWO.a_Derniere_fois_planifie_le__c == NULL){
                NextRecCandidate = ARC_ManageRecurrences.nextWeekdayCandidate(NextRecCandidate, sourceWO.a_Jours_de_semaine__c, TRUE);
            }
            
            if(sourceWO.a_Recurrence_valide_au__c >= NextRecCandidate && sourceWO.a_Prochaine_planification_le__c >= NextRecCandidate && sourceWO.a_Recurrence_valide_du__c <= (NextRecCandidate +5)){
                sourceWO.a_Derniere_fois_planifie_le__c = NextRecCandidate;
                SourceWO.ZTriggerClone__c = TRUE;
        		Update SourceWO;
        		SourceWO.ZTriggerClone__c = FALSE;
        		Update SourceWO;
            }
        }
        
        
        
    }
}