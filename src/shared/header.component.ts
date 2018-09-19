import {Component,Output, EventEmitter} from '@angular/core';
import { AlertController } from "ionic-angular/components/alert/alert-controller";
import { NavController } from "ionic-angular/navigation/nav-controller";
import { GeneralProviderService } from "../providers/general-provider.service";

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
})
export class HeaderComponent {

  @Output()
  logout = new EventEmitter();


  constructor(
    private alertCtrl: AlertController,
    private generalProviderService: GeneralProviderService,
    private navCtrl: NavController
  ){}

  openLogoutDialog() {
    let alert = this.alertCtrl.create({
      title: 'Warning',
      message: 'Do you want to log out?',
      buttons: [
        {
          text: 'Cancel',
          handler: () => {
            console.log('Cancel clicked');
          }
        },
        {
          text: 'Yes',
          handler: () => {
            this.generalProviderService.logOut();
            this.logout.emit();
          }
        }]
    });
    alert.present();
  }
}
