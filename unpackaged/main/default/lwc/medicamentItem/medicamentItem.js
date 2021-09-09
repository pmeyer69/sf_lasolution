import { api, LightningElement } from 'lwc';


import hasPermission from '@salesforce/customPermission/DeleteUpdateMedicament';

export default class MedicamentItem extends LightningElement {

    @api
    medicament;

    get isButtonDisable() {
        return !hasPermission;
    }

    get isHistoric(){

        if(this.medicament.Date_de_fin__c  === 'undefined'){
            return false;
        }else{
            const now = Date.now();
            const datefin = new Date(this.medicament.Date_de_fin__c);
            return now > datefin.getTime();
        }
    }

    get ifLundi(){
        if(this.medicament.Lundi_check__c) 
            return true;
        else return false;
    }
    get ifMardi(){
        if(this.medicament.Mardi_check__c) 
            return true;
        else return false;
    }
    get ifMercredi(){
        if(this.medicament.Mercredi_check__c) 
            return true;
        else return false;
    }
    get ifJeudi(){
        if(this.medicament.Jeudi_check__c) 
            return true;
        else return false;
    }
    get ifVendredi(){
        if(this.medicament.Vendredi_check__c) 
            return true;
        else return false;
    }
    get ifSamedi(){
        if(this.medicament.Samedi_check__c) 
            return true;
        else return false;
    }
    get ifDimanche(){
        if(this.medicament.Dimanche_check__c) 
            return true;
        else return false;
    }
    get ifReserve(){
        if(this.medicament.R_serve__c)
            return true;
        else return false;
    }
    get ifRemarque(){
        if(this.medicament.Remarque__c)
            return true;
        return false;
    }

    setDateFin(event){
        const eventToDispatch = new CustomEvent('setdatefin', {detail: event.target.dataset.targetId});
        this.dispatchEvent(eventToDispatch);
    }

    deleteMedicament(event) {
        const eventToDispatch = new CustomEvent('deletemedicament', {detail: event.target.dataset.targetId});
        this.dispatchEvent(eventToDispatch);
    }


    editMedicament(event){
        const eventToDispatch = new CustomEvent('editmedicament', {detail: event.target.dataset.targetId});
        this.dispatchEvent(eventToDispatch);
    }

}