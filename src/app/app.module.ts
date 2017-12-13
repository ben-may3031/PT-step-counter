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
  apiKey: 'AIzaSyAiT0W4hDXGkUuw8juSgXFw_Tg3EOzeBlE',
  authDomain: 'testpt-df641.firebaseapp.com',
  databaseURL: 'https://testpt-df641.firebaseio.com',
  projectId: 'testpt-df641',
  storageBucket: 'testpt-df641.appspot.com',
  messagingSenderId: '1039827448088'
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
