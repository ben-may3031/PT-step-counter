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
  apiKey: "AIzaSyCf_4a8Sac4zKswcsDmxGtBWCmHdKa-Kvk",
  authDomain: "wazoku-bogota-expedition.firebaseapp.com",
  databaseURL: "https://wazoku-bogota-expedition-default-rtdb.firebaseio.com",
  projectId: "wazoku-bogota-expedition",
  storageBucket: "wazoku-bogota-expedition.appspot.com",
  messagingSenderId: "471486410964",
  appId: "1:471486410964:web:491c80723cd4924ebd4b41"
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
