import { getFieldValue, getRecord } from 'lightning/uiRecordApi';
import { api, LightningElement, track, wire } from 'lwc';

import { NavigationMixin } from 'lightning/navigation';

//Plan Intervention
import STATUT_FIELD from '@salesforce/schema/Plan_intervention__c.Statut__c';
import DOSS_PRISE_CHARGE__ID_FIELD from '@salesforce/schema/Plan_intervention__c.Dossier_de_prise_en_charge__c';
import PROBLEMES_FIELD from '@salesforce/schema/Plan_intervention__c.Problemes_identifies__c';
import REMARQUES_FIELD from '@salesforce/schema/Plan_intervention__c.Remarque_inf_ref__c';
import OBJECTIFS_FIELD from '@salesforce/schema/Plan_intervention__c.Objectifs__c';

//Dossier Intervention
import PATIENT_ID_FIELD from '@salesforce/schema/Dossier_de_prise_en_charge__c.Patient__c';


const planInterventionFields = [STATUT_FIELD, DOSS_PRISE_CHARGE__ID_FIELD, PROBLEMES_FIELD, REMARQUES_FIELD, OBJECTIFS_FIELD];
const dossierFields = [PATIENT_ID_FIELD];


export default class PlanIntervention extends NavigationMixin(LightningElement) {

    @api
    recordId;

    @track
    errorPlan;

    dossierPriseChargeId;

    patientId;

    address;

    planIntervention;
    
    dossierIntervention;

    refreshActesTab;

    @wire(getRecord, { recordId: '$recordId', fields: planInterventionFields })
    wiredPlanRecord({ error, data }) {
        if (error) {
            this.errorPlan = error.body.message;
        } else if (data) {
            this.planIntervention = data;
            this.dossierPriseChargeId = getFieldValue(this.planIntervention, DOSS_PRISE_CHARGE__ID_FIELD);
        }
    }

    @wire(getRecord, { recordId: '$dossierPriseChargeId', fields: dossierFields})
    wiredDossierRecord({ error, data }) {
        if (data) {
            this.dossierIntervention = data;
            this.patientId = getFieldValue(this.dossierIntervention, PATIENT_ID_FIELD);
        } else if (error) {
            console.error('ERROR => ', error);
        }
    }

    get isPlanInProgress(){
        return getFieldValue(this.planIntervention, STATUT_FIELD) === 'En préparation';
    }
    get statut(){
        return getFieldValue(this.planIntervention, STATUT_FIELD);
    }
    
}