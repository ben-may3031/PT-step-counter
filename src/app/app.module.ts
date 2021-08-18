import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AngularFireModule, } from 'angularfire2';
import { AngularFirestore, AngularFirestoreModule } from 'angularfire2/firestore';

// New imports to update based on AngularFire2 version 4
import { AngularFireDatabaseModule } from 'angularfire2/database';
import { AngularFireAuthModule } from 'angularfire2/auth';
import { AngularFireDatabase, FirebaseListObservable, FirebaseObjectObservable } from 'angularfire2/database-deprecated';

import { Ng2OrderModule } from 'ng2-order-pipe';

import { AppComponent } from './app.component';



export const firebaseConfig = {
  apiKey: "AIzaSyBoyvJNfr4kV3seqOyI1_Jw7HMdebtMGd0",
  authDomain: "wazoku-steps.firebaseapp.com",
  databaseURL: "https://wazoku-steps-default-rtdb.firebaseio.com",
  projectId: "wazoku-steps",
  storageBucket: "wazoku-steps.appspot.com",
  messagingSenderId: "315198827013",
  appId: "1:315198827013:web:a8cf36dd24428db213ca6c"
};

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AngularFireModule.initializeApp(firebaseConfig),
    AngularFireDatabaseModule,
    AngularFireAuthModule,
    AngularFirestoreModule,
    Ng2OrderModule
  ],
  providers: [AngularFireDatabase],
  bootstrap: [AppComponent]
})
export class AppModule { }
