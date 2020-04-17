import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { OidcDataService } from '../api/oidc-data.service';
import { ConfigurationProvider } from '../config';
import { EventsService, EventTypes } from '../events';
import { LoggerService } from '../logging/logger.service';
import { StoragePersistanceService } from '../storage';

@Injectable()
export class OidcSecurityUserService {
    constructor(
        private oidcDataService: OidcDataService,
        private storagePersistanceService: StoragePersistanceService,
        private eventService: EventsService,
        private loggerService: LoggerService,
        private readonly configurationProvider: ConfigurationProvider
    ) {}

    initUserDataFromStorage() {
        const userData = this.storagePersistanceService.userData;
        if (userData) {
            this.setUserData(userData);
        }
    }

    getUserDataFromSts() {
        return this.getIdentityUserData().pipe(map((data: any) => this.setUserData(data)));
    }

    getUserData(): any {
        if (!this.storagePersistanceService.userData) {
            throw Error('UserData is not set!');
        }

        return this.storagePersistanceService.userData;
    }

    setUserData(value: any): void {
        this.storagePersistanceService.userData = value;
        this.eventService.fireEvent(EventTypes.UserDataChanged, value);
    }

    resetUserData(): void {
        this.storagePersistanceService.userData = '';
        this.eventService.fireEvent(EventTypes.UserDataChanged, '');
    }

    private getIdentityUserData(): Observable<any> {
        const token = this.storagePersistanceService.getAccessToken();

        if (!this.configurationProvider.wellKnownEndpoints) {
            this.loggerService.logWarning('init check session: authWellKnownEndpoints is undefined');

            throw Error('authWellKnownEndpoints is undefined');
        }

        const canGetUserData =
            this.configurationProvider.wellKnownEndpoints && this.configurationProvider.wellKnownEndpoints.userinfoEndpoint;

        if (!canGetUserData) {
            this.loggerService.logError(
                'init check session: authWellKnownEndpoints.userinfo_endpoint is undefined; set auto_userinfo = false in config'
            );
            throw Error('authWellKnownEndpoints.userinfo_endpoint is undefined');
        }

        return this.oidcDataService.getIdentityUserData(this.configurationProvider.wellKnownEndpoints.userinfoEndpoint || '', token);
    }
}
