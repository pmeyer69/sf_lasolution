import { createRecord, getFieldValue, getRecord } from 'lightning/uiRecordApi';
import { api, LightningElement, wire } from 'lwc';

import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import WORK_ORDER_FIELD from '@salesforce/schema/Plan_Intervention_Context__c.Work_Order__c';
import PLAN_INTER_FIELD from '@salesforce/schema/Plan_Intervention_Context__c.Plan_intervention__c';

import PLAN_INTER_CONTEXT_OBJECT from '@salesforce/schema/Plan_Intervention_Context__c';


import CITY_FIELD from '@salesforce/schema/Account.ShippingCity';
import STATE_FIELD from '@salesforce/schema/Account.ShippingState';
import POSTAL_CODE_FIELD from '@salesforce/schema/Account.ShippingPostalCode';
import COUNTRY_FIELD from '@salesforce/schema/Account.ShippingCountry';
import STREET_FIELD from '@salesforce/schema/Account.ShippingStreet';
import PATIENT_NAME_FIELD from '@salesforce/schema/Account.Name';

export default class PrestationRecordModal extends LightningElement {

    isModalEditOpen = false;
    isModalCreateOpen = false;
    isModalReadOnlyOpen = false;


    @api
    recordId;

    @api
    planInterventionId;

    @api
    accountId;

    @api
    dossierPriseChargeId;

    @api
    patientId;


    @wire(getRecord, { recordId: '$patientId', fields: [ PATIENT_NAME_FIELD, STREET_FIELD, CITY_FIELD, STATE_FIELD, POSTAL_CODE_FIELD, COUNTRY_FIELD] })
    patient;


    get street() {
        return getFieldValue(this.patient.data, STREET_FIELD);
    }

    get city(){
        return getFieldValue(this.patient.data, CITY_FIELD );
    }

    get state(){
        return getFieldValue(this.patient.data, STATE_FIELD);
    }

    get postalCode(){
        return getFieldValue(this.patient.data, POSTAL_CODE_FIELD);
    }

    get country(){
        return getFieldValue(this.patient.data, COUNTRY_FIELD);
    }


    @api
    openEditModal(){
        this.isModalEditOpen = true;
    }

    @api
    openCreateModal(){
        this.isModalCreateOpen = true;
    }

    @api
    openReadOnlyModal(){
        this.isModalReadOnlyOpen = true;
    }


    closeEditModal(){
        this.isModalEditOpen = false;
    }

    closeReadOnlyModal(){
        this.isModalReadOnlyOpen = false;
    }

    closeCreateModal(){
        this.isModalCreateOpen = false;
    }

    handleEditSuccess() {
        this.isModalEditOpen = false;
        const eventCreation = new CustomEvent('editprestation');
        this.dispatchEvent(eventCreation);
    }

    handleCreateSuccess(event){
        const fields = {};
        fields[WORK_ORDER_FIELD.fieldApiName] = event.detail.id;
        fields[PLAN_INTER_FIELD.fieldApiName] = this.planInterventionId;
        let recordInput = {apiName: PLAN_INTER_CONTEXT_OBJECT.objectApiName, fields: fields};  
        createRecord(recordInput)
                .then(() => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Plan Intervention Context Created',
                        variant: 'success',
                    }),
                );


                this.isModalCreateOpen = false;
                const eventCreation = new CustomEvent('createprestation');
                this.dispatchEvent(eventCreation);
            }).catch(error => {

                console.log(JSON.stringify(error));
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error creating record',
                        message: error.body.message,
                        variant: 'error',
                    }),
                );
            });
    }



}