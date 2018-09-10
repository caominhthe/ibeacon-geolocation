import {Component, } from '@angular/core';
import {debounceTime} from 'rxjs/operators';
import {Subject} from 'rxjs';

@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss']
})
export class HeaderComponent {

    showSearchType = false;

  constructor(){}

    openLogoutDialog(): void {
        // this.dialog.open(LogoutComponent, {
        //     width: '250px',
        //     data: {}
        // });
    }
}

