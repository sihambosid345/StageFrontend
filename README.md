# HRMatrix – Frontend Angular

Application de gestion des ressources humaines (HRM) construite avec Angular 21.

## 🚀 Démarrage rapide

### Prérequis
- Node.js 18+
- Angular CLI : `npm install -g @angular/cli`

### Installation
```bash
npm install
```

### Lancement (développement)
```bash
ng serve
```
Accès : http://localhost:4200

### Build production
```bash
ng build --configuration=production
```

## ⚙️ Configuration API

Modifier l'URL du backend dans :
```
src/app/core/services/api.service.ts
```
```typescript
export const API_URL = 'http://localhost:3000'; // ← votre backend
```

## 📦 Modules disponibles

| Module            | Route               | Description                  |
|-------------------|---------------------|------------------------------|
| Tableau de bord   | `/dashboard`        | Vue d'ensemble avec KPIs     |
| Entreprises       | `/companies`        | CRUD entreprises             |
| Départements      | `/departments`      | CRUD départements            |
| Postes            | `/positions`        | CRUD postes                  |
| Employés          | `/employees`        | CRUD employés                |
| Présences         | `/attendance`       | Suivi des présences          |
| Contrats          | `/contracts`        | Contrats employés            |
| Licences          | `/licenses`         | Licences entreprises         |
| Périodes de paie  | `/payroll/periods`  | Périodes de paie             |
| Exécutions        | `/payroll/runs`     | Runs de paie                 |
| Lignes de paie    | `/payroll/items`    | Éléments de paie             |
| Bulletins         | `/payroll/payslips` | Bulletins de salaire         |
| Éléments variables| `/variable-items`   | Variables de paie            |
| Utilisateurs      | `/users`            | Gestion utilisateurs         |

## 🎨 Stack technique
- **Framework** : Angular 21 (standalone components)
- **Style** : SCSS avec design system CSS variables
- **Typo** : Sora (titres) + DM Sans (texte)
- **HTTP** : HttpClient avec services injectables
- **Routing** : Lazy loading sur chaque feature
