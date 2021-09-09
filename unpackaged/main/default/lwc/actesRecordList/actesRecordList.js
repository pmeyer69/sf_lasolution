import { api, LightningElement, track, wire } from 'lwc';

import findActesByPlanInerventionId from '@salesforce/apex/PrestationController.findActesByPlanInerventionId';

import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import { refreshApex } from '@salesforce/apex';

import { subscribe, MessageContext } from 'lightning/messageService';
import ACTES_EVENT_CHANNEL from '@salesforce/messageChannel/Actes__c';

import { deleteRecord } from 'lightning/uiRecordApi';

const actions = [
    { label: 'Delete', name: 'delete' },
    { label: 'Edit', name: 'edit' },
    { label: 'View', name: 'view' },
];

export default class ActesRecordList extends LightningElement{


    @wire(MessageContext)
    messageContext;

    columns =  [
        { label: 'Acte', fieldName: 'Acte__c'},
        { label: 'Code InterRai', fieldName: 'Code_InterRAI__c', sortable: true},
        { label: 'Prestation', fieldName: 'WorkOrderNum', sortable: true},
        { label: 'Temps', fieldName: 'Temps__c'},
        { label: 'Remarque de l’inf. réf.', fieldName: 'Remarque_de_l_inf_r_f__c'},
        {
            type: 'action',
            typeAttributes: { rowActions: actions },
        },
    ];

    @api
    dossierPriseChargeId

    @api
    planInterventionId;

    actes;

    selectedRecordId;

    wiredResult;

    @wire(findActesByPlanInerventionId, {planInterventionId:'$planInterventionId'})
    wiredRecord(result) {
        this.wiredResult = result;
        if (result.data) {
            let tempRecords = JSON.parse( JSON.stringify( result.data ) );
            tempRecords = tempRecords.map( row => {
                return { ...row, WorkOrderNum: row.a_Prestation__r.WorkOrderNumber};
            })
            this.actes = tempRecords;
            this.error = undefined;

        } else if (result.error) {
            this.error = result.error;
            this.actes = undefined;
        }
    }

    
    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;
        switch (actionName) {
            case 'delete':
                this.deleteRow(row);
                break;
            case 'edit':
                this.editRow(row);
                break;
            case 'view':
                this.viewRow(row);
                break;
            default:
        }
    }


    editRow(currentRow){
        this.selectedRecordId = currentRow.Id;
        this.template.querySelector('c-acte-record-modal').openEditModal();
    }


    viewRow(currentRow){
        this.selectedRecordId = currentRow.Id;
        this.template.querySelector('c-acte-record-modal').openReadOnlyModal();
    }


    deleteRow(rowToDelete) {
        const deleteRowId = rowToDelete.Id;
        deleteRecord(deleteRowId)
            .then(() => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Acte deleted',
                        variant: 'success'
                    })
                );
                return refreshApex(this.wiredResult);
            })
            .catch((error) => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error deleting record',
                        message: error,
                        variant: 'error'
                    })
                );
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
        let parseData = JSON.parse(JSON.stringify(this.actes));

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
        this.actes = parseData;

    }

  //////////////////////////////////////////////////////  



    // Encapsulate logic for LMS subscribe.
    subscribeToMessageChannel() {
        this.subscription = subscribe(
            this.messageContext,
            ACTES_EVENT_CHANNEL,
            (message) => this.handleMessage(message)
        );
    }

    // Handler for message received by component
    handleMessage() {

        return refreshApex(this.wiredResult);
    }

    // Standard lifecycle hooks used to sub/unsub to message channel
    connectedCallback() {
        this.subscribeToMessageChannel();
    }




}