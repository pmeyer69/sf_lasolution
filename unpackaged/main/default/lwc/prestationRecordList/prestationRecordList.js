import { api, LightningElement, track, wire } from 'lwc';

import findPrestationByPlanInerventionId from '@salesforce/apex/PrestationController.findPrestationByPlanInerventionId';

import findActesByPrestationId  from '@salesforce/apex/PrestationController.findActesByPrestationId';

import { publish, MessageContext } from 'lightning/messageService';
import ACTES_EVENT_CHANNEL from '@salesforce/messageChannel/Actes__c';


import { refreshApex } from '@salesforce/apex';

import { deleteRecord} from 'lightning/uiRecordApi';

/*
const actions = [
    { label: 'Delete', name: 'delete' },
    { label: 'Edit', name: 'edit' },
    { label: 'View', name: 'view' },
    { label: 'Ajouter Acte', name: 'Acte' },
];
*/

export default class PrestationRecordList extends LightningElement {

    @api
    patientId;

    @api
    planInterventionId;
   
    @api
    isPlanInProgress;

    @api
    dossierPriseChargeId;

    selectedRecordId = null;

    prestations;

    wiredResult;


    actesToDelete;

    columns =  [
        { label: 'Prestation', fieldName: 'WorkOrderNumber' },
        { label: 'Sujet', fieldName: 'Subject'},
        { label: 'Work Type', fieldName: 'WorkType', sortable: true},
        { label: 'Durée', fieldName: 'Duration'},
        { label: 'Type de prestation', fieldName: 'a_Type_de_Prestation__c'},

        {
            type: 'action',
            //typeAttributes: { rowActions: actions },
            typeAttributes: { rowActions: this.getRowActions},
        },
    ];

    @wire(MessageContext)
    messageContext;


    getRowActions(row, doneCallback) {
        if(row.isPlanNotInProgress) {
          doneCallback([
            { label: 'Delete', name: 'delete' },
            { label: 'Edit', name: 'edit' },
            { label: 'View', name: 'view' },
            { label: 'Ajouter Acte', name: 'Acte' },
        ]);
        }else {
          doneCallback([
            { label: 'View', name: 'view' },
        ]);
        }
      }


    @wire(findPrestationByPlanInerventionId, {planInterventionId:'$planInterventionId'})
    wiredRecord(result) {
        this.wiredResult = result;
        if (result.data) {
            let tempRecords = JSON.parse( JSON.stringify( result.data ) );

            tempRecords = tempRecords.map( row => {
                let workTypeName = '';
                if(row.WorkType!=null){
                    workTypeName = row.WorkType.Name
                }
                return { ...row, WorkType: workTypeName, isPlanNotInProgress: !this.isNotInProgress };
            })
            
            this.prestations = tempRecords;
            this.error = undefined;

        } else if (result.error) {
            this.error = result.error;
            this.prestations = undefined;
        }
    }



    get isNotInProgress(){
        return !this.isPlanInProgress;
    }


    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;
        switch (actionName) {
            case 'delete':
                this.deleteRow(row);
                break;
            case 'edit':
                this.editPrestation(row);
                break;
            case 'view':
                this.viewRow(row);
                break;
            case 'Acte':
                this.addActes(row);
                break;
            default:
        }
    }

 

    viewRow(currentRow){

        this.selectedRecordId = currentRow.Id;
        this.template.querySelector('c-prestation-record-modal').openReadOnlyModal();
    }

    addPrestation(){
        this.template.querySelector('c-prestation-record-modal').openCreateModal();
    }

    addActes(currentRow){
        this.selectedRecordId = currentRow.Id;
        this.template.querySelector('c-acte-record-modal').openCreateModal();
    }

    editPrestation(currentRow){
        this.selectedRecordId = currentRow.Id;
        this.template.querySelector('c-prestation-record-modal').openEditModal();
    }

    handleCreatePrestationSuccess(){
        return refreshApex(this.wiredResult);
    }

    handleEditSuccess(){
        return refreshApex(this.wiredResult);
    }



    deleteRow(rowToDelete) {
        const deleteRowId = rowToDelete.Id;
        //delete ACTES attached to Prestation to delete
        findActesByPrestationId({prestationId: deleteRowId}).then((result)=> {
            this.actesToDelete = result;
            Promise.all(
                result.forEach(element => {
                    deleteRecord(element.Id).then(()=>{
                        console.log('Acte Deleted');
                    });
                })
            ).then(
                deleteRecord(deleteRowId).then(() => {
                    console.log('Prestation Deleted');
                }).then(()=>{
                    return refreshApex(this.wiredResult);
                 }).then(() =>{
                    publish(this.messageContext, ACTES_EVENT_CHANNEL);
                    console.log('REFRESH ACTES');
                 })
            ).catch((error) => {
                console.log(JSON.stringify(error));
             });

         });
    }




    ////////////// SORT DATATABLE ///////////////////////

    @track sortBy;
    @track sortDirection;

    updateColumnSorting(event){
         // field name
        this.sortBy = event.detail.fieldName;

        // sort direction
        this.sortDirection = event.detail.sortDirection;

        // calling sortdata function to sort the data based on direction and selected field
        this.sortData(event.detail.fieldName, event.detail.sortDirection);;
    }

    sortData(fieldname, direction) {
        // serialize the data before calling sort function
        let parseData = JSON.parse(JSON.stringify(this.prestations));

        // Return the value stored in the field
        let keyValue = (a) => {
            return a[fieldname];
        };

        // cheking reverse direction 
        let isReverse = direction === 'asc' ? 1: -1;

        // sorting data 
        parseData.sort((x, y) => {
            x = keyValue(x) ? keyValue(x) : ''; // handling null values
            y = keyValue(y) ? keyValue(y) : '';

            // sorting values based on direction
            return isReverse * ((x > y) - (y > x));
        });

        // set the sorted data to data table data
        this.prestations = parseData;

    }

  //////////////////////////////////////////////////////  

}