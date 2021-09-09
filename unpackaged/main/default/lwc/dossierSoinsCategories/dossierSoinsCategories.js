import { api, LightningElement } from 'lwc';

import { NavigationMixin } from 'lightning/navigation';


export default class DossierSoinsCategories extends NavigationMixin(LightningElement)  {
    
    @api
    recordId;


    //TRANSMISSION
    navigateToRelatedTransmissionList(){
        this[NavigationMixin.Navigate]({
            type: 'standard__component',
            attributes: {
                componentName: 'c__NavigateToLwcMesure'
               },
            state: {
                c__recordId: this.recordId
            }
        });
    }

    //SIGNES VITAUX
    navigateToRelatedSignesVitauxList(){
        this[NavigationMixin.Navigate]({
            type: 'standard__recordRelationshipPage',
            attributes: {
                recordId: this.recordId,
                objectApiName: 'Dossier_de_soins__c',
                relationshipApiName: 'Signes_vitaux__r',
                actionName: 'view'
            }
        });
    }

    //SUIVI TP/INR
    navigateToRelatedTpInrList(){
        this[NavigationMixin.Navigate]({
            type: 'standard__recordRelationshipPage',
            attributes: {
                recordId: this.recordId,
                objectApiName: 'Dossier_de_soins__c',
                relationshipApiName: 'Suivis_TP_INR__r',
                actionName: 'view'
            }
        });
    }

    //SUIVI Hgt/Insuline
    navigateToRelatedHgtInsulineList(){
        this[NavigationMixin.Navigate]({
            type: 'standard__recordRelationshipPage',
            attributes: {
                recordId: this.recordId,
                objectApiName: 'Dossier_de_soins__c',
                relationshipApiName: 'Suivis_HGT_Insuline__r',
                actionName: 'view'
            }
        });
    }
    

    /*
    //MESURES
    navigateToRelatedMesureList() {
        this[NavigationMixin.Navigate]({
            type: 'standard__navItemPage',
            attributes: {
                objectApiName: 'Mesure_Poids'
            }
        });
    }
*/

/*
    //MESURES POIDS
    navigateToRelatedMesurePoidsList() {

        const urlWithParam = '/apex/Mesure_poids?Id='+this.recordId;
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: urlWithParam
            }
        });
    } 

    //MESURES Taille
    navigateToRelatedMesureTailleList() {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordRelationshipPage',
            attributes: {
                recordId: this.recordId,
                objectApiName: 'Dossier_de_soins__c',
                relationshipApiName: 'Mesures_Taille__r',
                actionName: 'view'
            }
        });
    }

    //MESURES TEMPERATURE
    navigateToRelatedMesureTemperatureList() {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordRelationshipPage',
            attributes: {
                recordId: this.recordId,
                objectApiName: 'Dossier_de_soins__c',
                relationshipApiName: 'Mesures_Temp_rature__r',
                actionName: 'view'
            }
        });
    }

    //MESURES OXYGENE
    navigateToRelatedMesureOxygeneList() {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordRelationshipPage',
            attributes: {
                recordId: this.recordId,
                objectApiName: 'Dossier_de_soins__c',
                relationshipApiName: 'Saturation_en_oxyg_ne__r',
                actionName: 'view'
            }
        });
    }

    //MESURES ABDOMINAL
    navigateToRelatedMesureAbdominalList() {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordRelationshipPage',
            attributes: {
                recordId: this.recordId,
                objectApiName: 'Dossier_de_soins__c',
                relationshipApiName: 'Mesures_P_rim_tre_abdominal__r',
                actionName: 'view'
            }
        });
    }   
*/




    //LISTE DE MEDICAMENTS
    navigateToRelatedMedicaments() {

        this[NavigationMixin.Navigate]({
            type: 'standard__component',
            attributes: {
                componentName: 'c__NavigateToMedicament'
               },
            state: {
                c__recordId: this.recordId
            }
        });
    }   

    //CHUTES
    navigateToRelatedChutesList() {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordRelationshipPage',
            attributes: {
                recordId: this.recordId,
                objectApiName: 'Dossier_de_soins__c',
                relationshipApiName: 'Relev_s_des_chutes__r',
                actionName: 'view'
            }
        });
    }
    //DOULEUR
    navigateToRelatedDouleurList() {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordRelationshipPage',
            attributes: {
                recordId: this.recordId,
                objectApiName: 'Dossier_de_soins__c',
                relationshipApiName: 'Evaluations_de_la_douleur__r',
                actionName: 'view'
            }
        });
    }

    //PLAIES
    navigateToRelatedPlaiesList() {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordRelationshipPage',
            attributes: {
                recordId: this.recordId,
                objectApiName: 'Dossier_de_soins__c',
                relationshipApiName: 'Evaluations_des_plaies__r',
                actionName: 'view'
            }
        });
    }

    //ESCARRES
    navigateToRelatedEscarreList() {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordRelationshipPage',
            attributes: {
                recordId: this.recordId,
                objectApiName: 'Dossier_de_soins__c',
                relationshipApiName: 'Escarres__r',
                actionName: 'view'
            }
        });
    }
    

    //HISTOIRE DE VIE
    navigateToRelatedVieList() {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordRelationshipPage',
            attributes: {
                recordId: this.recordId,
                objectApiName: 'Dossier_de_soins__c',
                relationshipApiName: 'Histoires_de_vie__r',
                actionName: 'view'
            }
        });
    }

    //PROJET DE VIE
    navigateToRelatedProjetVieList() {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordRelationshipPage',
            attributes: {
                recordId: this.recordId,
                objectApiName: 'Dossier_de_soins__c',
                relationshipApiName: 'Projets_de_vie__r',
                actionName: 'view'
            }
        });
    }

    
    //DIRECTIVES
    navigateToRelatedDirectiveList() {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordRelationshipPage',
            attributes: {
                recordId: this.recordId,
                objectApiName: 'Dossier_de_soins__c',
                relationshipApiName: 'Directives_anticip_es__r',
                actionName: 'view'
            }
        });
    }
    
}