import { api, LightningElement } from 'lwc';

import { loadScript } from 'lightning/platformResourceLoader';
//import findActesByPlanInerventionId from '@salesforce/apex/PrestationController.findActesByPlanInerventionId';

import downloadPDF from '@salesforce/apex/CreatePdfController.getPdfFileOpas';
import downloadjs from '@salesforce/resourceUrl/downloadjs';

export default class Opas extends LightningElement {

@api
recordId;




boolShowSpinner = false;

pdfString;

generatePdf(){
    this.boolShowSpinner = true;
    downloadPDF({planInterventionId:'$recordId'}).then(response => {
        console.log(response);
        this.boolShowSpinner = false;
        let strFile = "data:application/pdf;base64,"+response;
        window.download(strFile, "sample.pdf", "application/pdf");

    }).catch(error => {
        console.log('Error: ' +error.body.message);
    });
}
renderedCallback() {
    loadScript(this, downloadjs)
    .then(() => console.log('Loaded download.js'))
    .catch(error => console.log(error));
} 


}