# CRM · Empleados (`Employees`)

Especificación funcional, modelo de datos, reglas de acceso RBAC y campos de nómina/EBP para la entidad **Empleados** (`/api/v1/crm/employees`), basada en `src/data/employees.ts`, `src/components/CrmEmployees.tsx` y `src/App.tsx`.

---

## 1. Descripción Funcional

Administra el directorio de talento humano, adscripción organizacional (departamento y sede física), condiciones salariales base para **Nómina**, parámetros bancarios de dispersión (**EBP**) y la habilitación opcional del empleado como **usuario con acceso al sistema** mediante asignación de uno o más roles.

---

## 2. Campos Obligatorios vs. Opcionales (`CreateEmployeeDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `employeeCode` | `string` (max 40) | **Sí** | `EMP-XXX` | Código único de colaborador por `organization_id` (ej. `EMP-001`). |
| `fullName` | `string` (max 160) | **Sí** | — | Nombre completo del colaborador. |
| `email` | `string` (email, max 180) | **Sí** | — | Correo corporativo; único por `organization_id`. |
| `roleTitle` | `string` (max 120) | **Sí** | — | Puesto o cargo organizacional (ej. `"Gerente de Operaciones"`). |
| `phone` | `string` (max 40) | No | `""` | Teléfono de contacto. |
| `hasSystemAccess` | `boolean` | No | `false` | Indica si el empleado tiene cuenta de usuario activa en AES Nexus. |
| `roles` | `string[]` (`RoleKey[]`) | Condicional* | `[]` | Roles asignados desde `Settings > Roles y permisos` (ej. `['Administrador', 'Finanzas']`). |
| `departmentId` | `string` | No | Primer depto. | FK al departamento asignado (`dep_1`, etc.). |
| `departmentName` | `string` | Proyectado | — | Nombre del departamento resuelto por join en servidor. |
| `locationId` | `string` | No | Primera sede | FK a la sede física (`loc_1`, etc.). |
| `locationName` | `string` | Proyectado | — | Nombre de la sede resuelto por join en servidor. |
| `contractType` | `enum` | No | `'Tiempo completo'` | `'Tiempo completo'` \| `'Medio tiempo'` \| `'Por proyecto'` \| `'Honorarios'`. |
| `hireDate` | `string` (`YYYY-MM-DD`) | No | Fecha actual | Fecha de ingreso laboral. |
| `status` | `enum` | No | `'Activo'` | `'Activo'` \| `'En licencia'` \| `'Inactivo'`. |
| `rfc` | `string` (max 24) | No | `null` | Tax ID localizado (`RFC` MX, `NIF` ES, `RIF` VE, `Tax ID` GLOBAL), en mayúsculas. |
| `curp` | `string` (max 30) | No | `null` | Identificación nacional (`CURP` 18 chars MX, `DNI/NIE` ES, `Cédula` VE), en mayúsculas. |
| `nss` | `string` (max 30) | No | `null` | Número de seguridad social (`NSS` MX, `Seg. Social` ES, `IVSS` VE). |
| `baseSalaryMonthly` | `number` (`>= 0`) | No | `25000` | Sueldo mensual bruto base (`numeric(12,2)`). |
| `paymentFrequency` | `enum` | No | `'Quincenal'` | `'Quincenal'` \| `'Semanal'` \| `'Mensual'`. |
| `bankName` | `string` (max 100) | No | `null` | Institución bancaria para dispersión de nómina. |
| `clabe` | `string` (max 34) | No | `null` | Ruteo bancario validado por país (`CLABE` 18d Mod-10 MX / `IBAN` ES / `Cuenta 20d` VE). |
| `accountNumber` | `string` (max 34) | No | `null` | Número de cuenta bancaria complementario. |
| `bankPackValues` | `object` | No | `{}` | Valores dinámicos por Pack EBP de nómina (`{ [packId]: { [fieldKey]: string } }`). |
| `emergencyContact` | `string` (max 180) | No | `null` | Nombre y teléfono de contacto de emergencia. |
| `notes` | `string` (max 2000) | No | `null` | Notas internas de contratación o esquema de compensación. |

*\*Regla crítica de acceso al sistema:*
- Si `hasSystemAccess === true`, el arreglo `roles` es **obligatorio** y debe contener al menos 1 rol válido (`roles.length >= 1`).
- Si `hasSystemAccess === false`, `roles` debe normalizarse a `[]` y deshabilitar credenciales/sesión de acceso.

### Campos Generados por el Servidor (Salida `EmployeeRecord`)

- `id` (`uuid` / `emp_*`), `initials` (`string`, 2 caracteres desde `fullName`), `avatarColor` (`'sage' | 'blue' | 'peach' | 'lilac' | 'amber'`), `createdAt`, `updatedAt`.

---

## 3. Endpoints REST

| Método | Ruta | Descripción | RBAC |
|---|---|---|---|
| `GET` | `/api/v1/crm/employees` | Lista filtrable por `search`, `departmentId`, `locationId`, `status`, `accessFilter` (`users_only`/`no_access`/`roleId`) | `CRM.Empleados` (`read`) |
| `GET` | `/api/v1/crm/employees/:id` | Ficha completa del colaborador | `CRM.Empleados` (`read`) |
| `POST` | `/api/v1/crm/employees` | Alta de empleado (y usuario si `hasSystemAccess === true`) | `CRM.Empleados` (`write`) |
| `PATCH` | `/api/v1/crm/employees/:id` | Actualización de ficha, salario, datos EBP y acceso | `CRM.Empleados` (`write`) |
| `PUT` | `/api/v1/crm/employees/:id/roles` | Selector rápido de acceso al sistema y roles (`hasSystemAccess`, `roles[]`) | `CRM.Empleados` (`write`) + `manageUsers` |
| `PATCH` | `/api/v1/crm/employees/:id/status` | Cambio rápido de estado (`Activo`/`En licencia`/`Inactivo`) | `CRM.Empleados` (`write`) |
| `DELETE` | `/api/v1/crm/employees/:id` | Baja lógica o `409` si tiene recibos en corridas de nómina pagadas | `CRM.Empleados` (`full`) |

---

## 4. Auditoría

Registrar bajo categoría `users` en `audit_logs`:
- `crm.employee.created` (indicando si quedó como usuario con roles o solo empleado).
- `crm.employee.updated` y `crm.employee.access_updated`.
- `crm.employee.deleted`.
