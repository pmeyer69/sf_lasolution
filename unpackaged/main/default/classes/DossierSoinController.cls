public with sharing class DossierSoinController {
    
    @AuraEnabled(cacheable=true)
    public static List<Transmission__c> findTransmissionsByDossierSoinId(String dossierSoinId){
        return [SELECT id, 
                        Date_de_la_transmission__c, 
                        Evaluations__c, 
                        Transmission__c, 
                        CreatedById, 
                        Cible__c, 
                        Name,
                        Indicateur__c
                FROM Transmission__c 
                WHERE Dossier_de_soins_del__c =: dossierSoinId 
                ORDER BY Date_de_la_transmission__c desc];
    }

    @AuraEnabled(cacheable=true)
    public static List<m_dicament__c> findMedicamentsByDossierSoinId(String dossierSoinId){
        return [SELECT  id,
                        Dossier_de_soins__c, 
                        Name,
                        Date_de_d_but__c,
                        Date_de_fin__c, 
                        CreatedById,
                        Cat_gories__c,
                        M_dicament__c,
                        prise_journaliere__c,
                        Prise_hebdomadaire__c,
                        Jours__c,
                        Lundi_check__c,
                        Mardi_check__c,
                        Mercredi_check__c,
                        jeudi_check__c,
                        Vendredi_check__c,
                        Samedi_check__c,
                        Dimanche_check__c,
                        R_serve__c,
                        Remarque__c,
                        Matin__c,
                        Midi__c,
                        Soir__c	,
                        Nuit__c
                FROM m_dicament__c 
                WHERE Dossier_de_soins__c =: dossierSoinId 
                ORDER BY Date_de_d_but__c desc];
    }

}