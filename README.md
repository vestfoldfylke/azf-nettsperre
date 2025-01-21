# AZF-NETTSPERRE
En azure function for håndtering av sperringer satt i nettsperre-løsningen. 
## Functions
### activateBlocks.js

`activateBlocks`-funksjonen er en Azure-tidsstyrt funksjon som aktiverer blokker i MongoDB.

#### Funksjonsdetaljer

- **Fil**: [src/functions/activateBlocks.js](src/functions/activateBlocks.js)
- **Tidsplan**: `0-59/5 * * * *` (Hvert 5. minutt fra 0 til 59)
- **Autentiseringsnivå**: `anonymous`

#### Beskrivelse

Denne funksjonen kjører med jevne mellomrom basert på den angitte tidsplanen. Den aktiverer blokker ved å bruke `handleUserActions`-funksjonen.

- **handleUserActions**: [src\lib\jobs\handleUserActions.js](src\lib\jobs\handleUserActions.js)
    - [Les mer her](#handleuseractions)

#### Eksempel Svar

```json
{
    "status": 200,
    "jsonBody": "..."
}
```


### deactivateBlocks.js

`deactivateBlocks`-funksjonen er en Azure-tidsstyrt funksjon som deaktiverer blokker og flytter dem til historikk-kolleksjonen i MongoDB.

#### Funksjonsdetaljer

- **Fil**: [src/functions/deactivateBlocks.js](src/functions/deactivateBlocks.js)
- **Tidsplan**: `2-59/5 * * * *` (Hvert 5. minutt fra 2 til 59)
- **Autentiseringsnivå**: `anonymous`

#### Beskrivelse

Denne funksjonen kjører med jevne mellomrom basert på den angitte tidsplanen. Den deaktiverer blokker ved å bruke `handleUserActions`-funksjonen og flytter deaktiverte og slettede blokker til historikk-kolleksjonen ved å bruke `moveDocuments`-funksjonen.

- **handleUserActions**: [src\lib\jobs\handleUserActions.js](src\lib\jobs\handleUserActions.js)
    - [Les mer her](#handleuseractions)
- **moveDocuments**: [src\lib\jobs\handleUserActions.js](src\lib\jobs\handleUserActions.js)
    - [Les mer her](#movedocuments)

#### Eksempel Svar

```json
{
    "status": 200,
    "jsonBody": "..."
}
```
### deleteBlock.js

`deleteBlock`-funksjonen er en Azure-funksjon som håndterer sletting eller deaktivering av en blokkering i MongoDB.

#### Funksjonsdetaljer

- **Fil**: [src/functions/deleteBlock.js](src/functions/deleteBlock.js)
- **Rute**: `deleteBlock/{id}/{action}`
- **Metoder**: `POST`
- **Autentiseringsnivå**: `anonymous`

#### Parametere

- `id`: ID-en til blokkeringen som skal slettes eller deaktiveres.
- `action`: Handlingen som skal utføres (`delete` eller `deactivate`).

#### Beskrivelse

Denne funksjonen håndterer sletting eller deaktivering av en blokkering basert på statusen til blokkeringen og den oppgitte handlingen. Hvis blokkeringen er aktiv og handlingen er `delete`, endres handlingen til `deactivate`.

#### Eksempel Forespørsel

```http
POST /api/deleteBlock/60c72b2f9b1d8e5a5c8b4567/delete
Content-Type: application/json
```

#### Eksempel Svar

```json
Status 200
```

### extendedUserInfo.js

`extendedUserInfo`-funksjonen er en Azure-funksjon som henter utvidet informasjon om en bruker basert på deres User Principal Name (UPN).

#### Funksjonsdetaljer

- **Fil**: [src/functions/extendedUserInfo.js](src/functions/extendedUserInfo.js)
- **Rute**: `extendedUserInfo/{upn}`
- **Metoder**: `GET`
- **Autentiseringsnivå**: `anonymous`

#### Parametere

- `upn`: User Principal Name (UPN) til brukeren hvis informasjon skal hentes.

#### Beskrivelse

Denne funksjonen henter utvidet informasjon om en bruker ved hjelp av UPN. Den bruker `getUser`-funksjonen fra [../lib/graph/jobs/users.js](src/lib/graph/jobs/users.js) for å hente dataene.

#### Eksempel Forespørsel

```http
GET /api/extendedUserInfo/user@example.com
```

#### Eksempel Svar
```json
{
	"@odata.context": "https://graph.microsoft.com/v1.0/$metadata#users(id,displayName,givenName,surname,userPrincipalName,companyName,officeLocation,preferredLanguage,mail,jobTitle,mobilePhone,businessPhones)/$entity",
	"id": "...",
	"displayName": "...",
	"givenName": "...",
	"surname": "...",
	"userPrincipalName": "...",
	"companyName": "...",
	"officeLocation": "...",
	"preferredLanguage": "...",
	"mail": "...",
	"jobTitle": "...",
	"mobilePhone": "...",
	"businessPhones": []
}

```

### getBlocks.js
`getBlocks`-funksjonen er en Azure-funksjon som henter blokkeringsdata fra MongoDB basert på status og UPN.

#### Funksjonsdetaljer

- **Fil**: [src/functions/getBlocks.js](src/functions/getBlocks.js)
- **Rute**: `getBlocks/{status}/{upn}`
- **Metoder**: `GET`
- **Autentiseringsnivå**: `anonymous`

#### Parametere

- `status`: Statusen til blokkeringene som skal hentes. Kan være en kommaseparert streng med flere statuser (`pending`, `active`, `expired`).
- `upn`: User Principal Name (UPN) til brukeren hvis blokkeringsdata skal hentes.

#### Beskrivelse

Denne funksjonen henter blokkeringsdata fra MongoDB basert på den oppgitte statusen og UPN. Den validerer statusparameteren og håndterer både enkeltstatus og kommaseparerte strenger med flere statuser.

#### Eksempel Forespørsel

```http
GET /api/getBlocks/active,pending/user@example.com
```

#### Eksempel Svar
```json
[
    {
        "_id": "60c72b2f9b1d8e5a5c8b4567",
        "status": "pending",
        "students": [
            {
                "@odata.type": "#microsoft.graph.user",
                "id": "...",
                "displayName": "...",
                "officeLocation": "...",
                "userPrincipalName": "...",
                "mail": "..."
            },
            // flere students
        ],
        "teacher": {
            "teacherId": "...",
			"userPrincipalName": "...",
			"displayName": "...",
            "officeLocation": "..."
        },
        "blockedGroup": {
            "@odata.type": "#microsoft.graph.group",
			"id": "...",
			"displayName": "...",
			"mail": "...",
			"description": "..."
        },
        "typeBlock": {
            "type": "...",
			"groupId": "..."
        },
        "createdBy": {
            "userId": "...",
			"userPrincipalName": "...",
            "officeLocation": "...",
			"displayName": "..."
        },
        "startBlock": "timeStamp",
        "endBlock": "timeStamp",
        "createdTimeStamp": "timeStamp",
        "updated": []
    }
]

```

### getGroupMembers.js
`getGroupMembers`-funksjonen er en Azure-funksjon som henter medlemmer av en spesifisert gruppe.

#### Funksjonsdetaljer

- **Fil**: [src/functions/getGroupMembers.js](src/functions/getGroupMembers.js)
- **Rute**: `getGroupMembers/{groupId}/{onlyStudents?}`
- **Metoder**: `GET`, `POST`
- **Autentiseringsnivå**: `anonymous`

#### Parametere

- `groupId`: ID-en til gruppen hvis medlemmer skal hentes.
- `onlyStudents` (valgfri): Hvis satt til `true`, hentes kun elever.

#### Beskrivelse

Denne funksjonen henter medlemmer av en spesifisert gruppe ved hjelp av `groupId`. Hvis `onlyStudents`-parameteren er satt til `true`, hentes kun elever. Den bruker `getGroupMembers`-funksjonen fra [../lib/graph/jobs/groups.js](src/lib/graph/jobs/groups.js) for å hente dataene.

#### Eksempel Forespørsel

```http
GET /api/getGroupMembers/groupId123/true
```
#### Eksempel Svar
```json
[
	{
		"@odata.type": "#microsoft.graph.user",
		"id": "...",
		"displayName": "...",
		"mail": "...",
		"officeLocation": null
	},
	{
		"@odata.type": "#microsoft.graph.user",
		"id": "...",
		"displayName": "...",
		"mail": "...",
		"officeLocation": null
	}
]
```

### getOwnedGroups.js

`getOwnedGroups`-funksjonen er en Azure-funksjon som henter grupper eid av en spesifisert bruker.

#### Funksjonsdetaljer

- **Fil**: [src/functions/getOwnedGroups.js](src/functions/getOwnedGroups.js)
- **Rute**: `getOwnedGroups/{upn}`
- **Metoder**: `GET`, `POST`
- **Autentiseringsnivå**: `anonymous`

#### Parametere

- `upn`: User Principal Name (UPN) til brukeren hvis eide grupper skal hentes.

#### Beskrivelse

Denne funksjonen henter grupper eid av en spesifisert bruker ved hjelp av UPN. Den bruker `getOwnedObjects`-funksjonen fra [../lib/graph/jobs/groups.js](src/lib/graph/jobs/groups.js) for å hente dataene. 

#### Eksempel Forespørsel

```http
GET /api/getOwnedGroups/user@example.com
```

#### Eksempel Svar
```json
[
	{
		"@odata.type": "#microsoft.graph.group",
		"id": "...",
		"displayName": "...",
		"mail": "...",
		"description": "..."
	},
	{
		"@odata.type": "#microsoft.graph.group",
		"id": "...",
		"displayName": "...",
		"mail": "...",
		"description": "..."
	}   
]
```

### history.js

`history`-funksjonen er en Azure-funksjon som henter historiske data basert på spesifiserte filtre som lærer, kurs og skole.

#### Funksjonsdetaljer

- **Fil**: [src/functions/history.js](src/functions/history.js)
- **Rute**: `history/{teacher?}/{course?}/{school?}`
- **Metoder**: `GET`
- **Autentiseringsnivå**: `anonym`

#### Parametere

- `teacher` (valgfri): User Principal Name (UPN) til læreren.
- `course` (valgfri): Visningsnavnet til den blokkerte gruppen (kurset).
- `school` (valgfri): Kontorplasseringen til læreren (skolen).

#### Beskrivelse

Denne funksjonen bygger et filterobjekt basert på de oppgitte parameterne og søker i MongoDB `historie`-collection etter samsvarende poster. Resultatene sorteres i synkende rekkefølge etter `_id`.

#### Eksempel Forespørsel

```http
GET /api/history/teacher@example.com/courseName/schoolName
```

#### Eksempel Svar
```json
[
    {
        "_id": "60c72b2f9b1d8e5a5c8b4567",
        "status": "expired",
        "students": [
            {
                "@odata.type": "#microsoft.graph.user",
                "id": "...",
                "displayName": "...",
                "officeLocation": "...",
                "userPrincipalName": "...",
                "mail": "..."
            },
            // flere students
        ],
        "teacher": {
            "teacherId": "...",
			"userPrincipalName": "...",
			"displayName": "...",
            "officeLocation": "..."
        },
        "blockedGroup": {
            "@odata.type": "#microsoft.graph.group",
			"id": "...",
			"displayName": "...",
			"mail": "...",
			"description": "..."
        },
        "typeBlock": {
            "type": "...",
			"groupId": "..."
        },
        "createdBy": {
            "userId": "...",
			"userPrincipalName": "...",
            "officeLocation": "...",
			"displayName": "..."
        },
        "startBlock": "timeStamp",
        "endBlock": "timeStamp",
        "createdTimeStamp": "timeStamp",
        "updated": []
    }
]
```

### submitBlock.js
`submitBlock`-funksjonen er en Azure-funksjon som legger til en ny blokkering i MongoDB.

#### Funksjonsdetaljer

- **Fil**: [src/functions/submitBlock.js](src/functions/submitBlock.js)
- **Rute**: `submitBlock`
- **Metoder**: `POST`
- **Autentiseringsnivå**: `anonymous`

#### Parametere

Funksjonen forventer en JSON-body med følgende struktur:

- `teacher`: Informasjon om læreren som setter blokkeringen.
- `blockedGroup`: Informasjon om gruppen som blir blokkert.
- Andre relevante felt for blokkeringen.

#### Beskrivelse

Denne funksjonen mottar en JSON-body med informasjon om en ny blokkering og legger den til i MongoDB `blocksCollection`.

#### Eksempel Forespørsel

```http
POST /api/submitBlock
Content-Type: application/json
```
```json
{
    {
        "status": "pending",
        "students": [
            {
                "@odata.type": "#microsoft.graph.user",
                "id": "...",
                "displayName": "...",
                "userPrincipalName": "...",
                "officeLocation": "...",
                "mail": "..."
            },
                // flere students
        ],
        "teacher": {
            "teacherId": "...",
            "userPrincipalName": "...",
            "displayName": "...",
            "officeLocation": "..."
        },
        "blockedGroup": {
            "@odata.type": "#microsoft.graph.group",
            "id": "...",
            "displayName": "...",
            "mail": "...",
            "description": "..."
        },
        "typeBlock": {
            "type": "...",
            "groupId": "undefined"
        },
        "createdBy": {
            "userId": "...",
            "userPrincipalName": "...",
            "officeLocation": "...",
            "displayName": "..."
        },
        "startBlock": "timeStamp",
        "endBlock": "timeStamp",
        "createdTimeStamp": "timeStamp",
        "updated": []
    }
}
```
#### Eksempel Svar
```json
{
    "acknowledged": true,
    "insertedId": "60c72b2f9b1d8e5a5c8b4567"
}
```
### updateBlock.js
`updateBlock`-funksjonen er en Azure-funksjon som oppdaterer en eksisterende blokkering i MongoDB.

#### Funksjonsdetaljer

- **Fil**: [src/functions/updateBlock.js](src/functions/updateBlock.js)
- **Rute**: `updateBlock`
- **Metoder**: `PUT`
- **Autentiseringsnivå**: `anonymous`

#### Parametere

Funksjonen forventer en JSON-body med følgende struktur:

- `filter`: Et objekt som spesifiserer kriteriene for å finne blokkeringen som skal oppdateres.
- `update`: Et objekt som spesifiserer feltene som skal oppdateres.

#### Beskrivelse

Denne funksjonen mottar en JSON-body med informasjon om hvilken blokkering som skal oppdateres og hvilke felt som skal endres. Den oppdaterer deretter den spesifiserte blokkeringen i MongoDB.

#### Eksempel Forespørsel
```http
PUT /api/updateBlock
Content-Type: application/json
```
Eksempel: Legge til en elev.
```json
{
    {
        "status": "pending",
        "students": [
            {
                "@odata.type": "#microsoft.graph.user",
                "id": "...",
                "displayName": "...",
                "userPrincipalName": "...",
                "officeLocation": "...",
                "mail": "..."
            },
                // flere students
        ],
        "teacher": {
            "teacherId": "...",
            "userPrincipalName": "...",
            "displayName": "...",
            "officeLocation": "..."
        },
        "blockedGroup": {
            "@odata.type": "#microsoft.graph.group",
            "id": "...",
            "displayName": "...",
            "mail": "...",
            "description": "..."
        },
        "typeBlock": {
            "type": "...",
            "groupId": "undefined"
        },
        "createdBy": {
            "userId": "...",
            "userPrincipalName": "...",
            "officeLocation": "...",
            "displayName": "..."
        },
        "startBlock": "timeStamp",
        "endBlock": "timeStamp",
        "createdTimeStamp": "timeStamp",
        "updated": [
            {
                "updatedBy": {
                    "displayName": "...",
                    "teacherId": "...",
                    "userPrincipalName": "..."
                },
                "updatedTimeStamp": "2025-01-08T12:03:18.639Z",
                "studentsToRemove": [],
                "studentsToAdd": [
                    {
                        {
                            "@odata.type": "#microsoft.graph.user",
                            "id": "...",
                            "displayName": "...",
                            "userPrincipalName": "...",
                            "officeLocation": "...",
                            "mail": "..."
                        }
                    }
                ],
                "typeBlockChange": {},
                "dateBlockChange": {
                    "start": {},
                    "end": {}
                }
            }
        ]
    }
}
```
#### Eksempel Svar
```json
{
    "acknowledged": true,
    "modifiedCount": 1
}
```

### validatePermissions.js
`validatePermission`-funksjonen er en Azure-funksjon som validerer om en forespørrer har tillatelse til å redigere en lærer basert på spesifikke kriterier.

#### Funksjonsdetaljer

- **Fil**: [src/functions/validatePermission.js](src/functions/validatePermission.js)
- **Rute**: `validatePermission`
- **Metoder**: `POST`
- **Autentiseringsnivå**: `anonymous`

#### Parametere

Funksjonen forventer en JSON-body med følgende struktur:

- `requestorUPN`: User Principal Name (UPN) til forespørreren.
- `teacherToBeEditedUPN`: User Principal Name (UPN) til læreren som skal redigeres.

#### Beskrivelse

Denne funksjonen validerer om forespørreren har tillatelse til å redigere læreren basert på følgende kriterier:
1. Hvis forespørreren er en del av de tillatte selskapene, hoppes valideringen over.
2. Hvis forespørreren ikke er en del av de tillatte selskapene, sjekkes det om forespørreren og læreren som skal redigeres er på samme kontorplassering.

#### Eksempel Forespørsel

```http
POST /api/validatePermission
Content-Type: application/json

{
    "requestorUPN": "requestor@example.com",
    "teacherToBeEditedUPN": "teacher@example.com"
}
```
#### Eksempel Svar
Om alt gikk bra: 
```json
{
	"requestor": {
		"@odata.context": "https://graph.microsoft.com/v1.0/$metadata#users(id,displayName,givenName,surname,userPrincipalName,companyName,officeLocation,preferredLanguage,mail,jobTitle,mobilePhone,businessPhones)/$entity",
		"id": "...",
		"displayName": "...",
		"givenName": "...",
		"surname": "...",
		"userPrincipalName": "...",
		"companyName": "...",
		"officeLocation": "...", // Match her, eller skipValidation === true
		"preferredLanguage": null,
		"mail": "...",
		"jobTitle": "...",
		"mobilePhone": "...",
		"businessPhones": []
	},
	"teacher": {
		"@odata.context": "https://graph.microsoft.com/v1.0/$metadata#users(id,displayName,givenName,surname,userPrincipalName,companyName,officeLocation,preferredLanguage,mail,jobTitle,mobilePhone,businessPhones)/$entity",
		"id": "...",
		"displayName": "...",
		"givenName": "...",
		"surname": "...",
		"userPrincipalName": "...",
		"companyName": "...",
		"officeLocation": "...", // Match her, eller skipValidation === true
		"preferredLanguage": null,
		"mail": "...",
		"jobTitle": "...",
		"mobilePhone": "...",
		"businessPhones": []
	}
}

```

Status 403 Forbidden om valideringen ikke gikk bra.

## Jobs

### handleLogEntry
TODO!

### createStats

`createStats`-funksjonen er en funksjon som oppretter statistikk for en blokkering i MongoDB.

#### Funksjonsdetaljer

- **Fil**: [src/lib/jobs/createStats.js](src/lib/jobs/createStats.js)

#### Parametere

- `block`: Objektet som representerer blokkeringen.
  - `block._id`: ID-en til blokkeringen.
  - `block.teacher.userPrincipalName`: User Principal Name (UPN) til læreren som eier teamet.
  - `block.createdBy.userPrincipalName`: User Principal Name (UPN) til personen som opprettet blokkeringen.
  - `block.typeBlock.type`: Typen blokkering.
  - `block.students`: Array av studenter i blokkeringen.
  - `block.updated`: Array av oppdateringer gjort på blokkeringen.
- `action`: Handlingen som skal utføres for statistikken.

#### Beskrivelse

Denne funksjonen oppretter statistikk for en blokkering ved å hente informasjon om læreren som eier teamet og personen som opprettet blokkeringen. Den bygger deretter en forespørsel og sender den til statistikk-API-et.

Dokumentasjon finner du her: [azf-statistics](https://github.com/telemarkfylke/azf-statistics)

### handleUserActions.js

`handleUserActions`-funksjonen er en funksjon som håndterer brukerhandlinger som aktivering og deaktivering av blokker.

#### Funksjonsdetaljer

- **Fil**: [src\lib\jobs\handleUserActions.js](src/lib/jobs/handleUserActions.js)

#### Parametere

- `action`: Handlingen som skal utføres (`activate` eller `deactivate`).

#### Beskrivelse

Denne funksjonen håndterer brukerhandlinger ved å aktivere eller deaktivere blokker basert på den oppgitte handlingen.

### moveDocuments.js

`moveDocuments`-funksjonen er en funksjon som flytter dokumenter fra en kildekolleksjon til en målkolleksjon i MongoDB basert på et filter.

#### Funksjonsdetaljer

- **Fil**: [src/functions/moveDocuments.js](src/functions/moveDocuments.js)

#### Parametere

- `sourceCollection`: Navnet på kildekolleksjonen.
- `targetCollection`: Navnet på målkolleksjonen.
- `filter`: Et objekt som spesifiserer kriteriene for å finne dokumentene som skal flyttes.
- `limit`: Maksimalt antall dokumenter som skal flyttes.

#### Beskrivelse

Denne funksjonen flytter dokumenter fra en kildekolleksjon til en målkolleksjon basert på et filter. Den deler dokumentene inn i batcher av en spesifisert størrelse, setter inn hver batch i målkolleksjonen og sletter deretter hver batch fra kildekolleksjonen.

## Graph Jobs
### groups
`groups.js` inneholder funksjoner for å håndtere grupper i Microsoft Graph API, inkludert å hente eide objekter, hente gruppemedlemmer, legge til gruppemedlemmer og fjerne gruppemedlemmer.

#### Funksjonsdetaljer

- **Fil**: [src/functions/groups.js](src/functions/groups.js)

#### Funksjoner

##### getOwnedObjects
Henter objekter eid av en bruker.

###### Parametere

- `upn`: User Principal Name (UPN) til brukeren.

##### getGroupMembers
Henter medlemmer av en gruppe.

###### Parametere
- `groupId`: ID-en til gruppen.

##### addGroupMembers
Legger til medlemmer i en gruppe.

###### Parametere
- `groupId`: ID-en til gruppen.
- `members`: Array av medlemmer som skal legges til.

##### removeGroupMembers
Fjerner medlemmer fra en gruppe.

###### Parametere
- `groupId`: ID-en til gruppen.
- `members`: Array av medlemmer som skal fjernes.

### users
`users.js` inneholder funksjoner for å hente brukerdata fra Microsoft Graph API basert på User Principal Name (UPN).

#### Funksjonsdetaljer

- **Fil**: [src/functions/users.js](src/functions/users.js)

#### Funksjoner

##### getUser

Henter brukerdata fra Microsoft Graph API basert på den oppgitte User Principal Name (UPN).

###### Parametere

- `upn`: User Principal Name (UPN) til brukeren.

###### Beskrivelse

Denne funksjonen henter detaljer om en bruker fra Microsoft Graph API ved hjelp av UPN. Den returnerer et objekt med brukerens detaljer.