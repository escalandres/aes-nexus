import type { SkeletonResult, ResponsiveBones } from 'boneyard-js'
import { registerBones, configureBoneyard } from 'boneyard-js/react'

// Global boneyard-js configuration matching AES Nexus design tokens & dark theme
configureBoneyard({
  color: '#e7ece4',
  darkColor: '#1d2735',
  animate: 'shimmer',
  shimmerColor: '#f4f8f3',
  darkShimmerColor: '#283748',
  speed: '1.7s',
  transition: 300,
  stagger: 40,
})

/**
 * Bones for Executive Dashboard KPI Cards (4 side-by-side cards)
 */
export const executiveKpiBones: ResponsiveBones = {
  breakpoints: {
    375: {
      name: 'executive-kpis',
      viewportWidth: 375,
      width: 375,
      height: 480,
      bones: [
        // Card 1
        [0, 10, 45, 12, 4],
        [0, 32, 60, 24, 6],
        [0, 64, 75, 10, 4],
        [0, 84, 40, 14, 4],
        // Card 2
        [0, 130, 45, 12, 4],
        [0, 152, 60, 24, 6],
        [0, 184, 75, 10, 4],
        [0, 204, 40, 14, 4],
        // Card 3
        [0, 250, 45, 12, 4],
        [0, 272, 60, 24, 6],
        [0, 304, 75, 10, 4],
        [0, 324, 40, 14, 4],
        // Card 4
        [0, 370, 45, 12, 4],
        [0, 392, 60, 24, 6],
        [0, 424, 75, 10, 4],
        [0, 444, 40, 14, 4],
      ],
    },
    768: {
      name: 'executive-kpis',
      viewportWidth: 768,
      width: 768,
      height: 240,
      bones: [
        // Row 1
        [0, 12, 22, 12, 4],
        [0, 34, 35, 24, 6],
        [0, 68, 42, 11, 4],
        [0, 88, 28, 14, 4],
        [52, 12, 22, 12, 4],
        [52, 34, 35, 24, 6],
        [52, 68, 42, 11, 4],
        [52, 88, 28, 14, 4],
        // Row 2
        [0, 132, 22, 12, 4],
        [0, 154, 35, 24, 6],
        [0, 188, 42, 11, 4],
        [0, 208, 28, 14, 4],
        [52, 132, 22, 12, 4],
        [52, 154, 35, 24, 6],
        [52, 188, 42, 11, 4],
        [52, 208, 28, 14, 4],
      ],
    },
    1200: {
      name: 'executive-kpis',
      viewportWidth: 1200,
      width: 1200,
      height: 125,
      bones: [
        // Card 1: Ventas Totales
        [0, 10, 10, 11, 4],
        [0, 32, 16, 26, 6],
        [0, 66, 20, 11, 4],
        [0, 88, 12, 14, 4],
        // Card 2: Margen Bruto
        [25.5, 10, 10, 11, 4],
        [25.5, 32, 14, 26, 6],
        [25.5, 66, 18, 11, 4],
        [25.5, 88, 12, 14, 4],
        // Card 3: Nuevos Clientes
        [51, 10, 10, 11, 4],
        [51, 32, 12, 26, 6],
        [51, 66, 18, 11, 4],
        [51, 88, 12, 14, 4],
        // Card 4: Oportunidades Ganadas
        [76.5, 10, 10, 11, 4],
        [76.5, 32, 15, 26, 6],
        [76.5, 66, 19, 11, 4],
        [76.5, 88, 12, 14, 4],
      ],
    },
  },
}

/**
 * Bones for RevenueTargetChart (Executive Dashboard Chart)
 */
export const executiveChartBones: SkeletonResult = {
  name: 'executive-chart',
  viewportWidth: 1200,
  width: 1200,
  height: 380,
  bones: [
    // Header
    [0, 10, 25, 16, 4],
    [0, 34, 40, 12, 4],
    [80, 12, 18, 22, 6],
    // Chart grid and bars placeholder
    [5, 80, 10, 180, 4],
    [20, 110, 10, 150, 4],
    [35, 70, 10, 190, 4],
    [50, 95, 10, 165, 4],
    [65, 60, 10, 200, 4],
    [80, 50, 10, 210, 4],
    // Baseline
    [2, 275, 96, 2, 2],
    // 6-month historical pill strip
    [2, 310, 14, 45, 6],
    [18, 310, 14, 45, 6],
    [34, 310, 14, 45, 6],
    [50, 310, 14, 45, 6],
    [66, 310, 14, 45, 6],
    [82, 310, 14, 45, 6],
  ],
}

/**
 * Bones for Executive Dashboard Operational Alert Hub
 */
export const executiveAlertHubBones: SkeletonResult = {
  name: 'executive-alerts',
  viewportWidth: 1200,
  width: 1200,
  height: 100,
  bones: [
    // Alert 1
    [0, 8, 8, 10, 3],
    [0, 26, 16, 14, 4],
    [0, 48, 21, 10, 3],
    [0, 68, 12, 12, 4],
    // Alert 2
    [25.5, 8, 8, 10, 3],
    [25.5, 26, 16, 14, 4],
    [25.5, 48, 21, 10, 3],
    [25.5, 68, 12, 12, 4],
    // Alert 3
    [51, 8, 8, 10, 3],
    [51, 26, 16, 14, 4],
    [51, 48, 21, 10, 3],
    [51, 68, 12, 12, 4],
    // Alert 4
    [76.5, 8, 8, 10, 3],
    [76.5, 26, 16, 14, 4],
    [76.5, 48, 21, 10, 3],
    [76.5, 68, 12, 12, 4],
  ],
}

/**
 * Bones for Inventory Table in OperationsInventory
 */
export const inventoryTableBones: SkeletonResult = {
  name: 'inventory-table',
  viewportWidth: 1200,
  width: 1200,
  height: 320,
  bones: [
    // Table Header
    [0, 8, 8, 12, 3],
    [10, 8, 20, 12, 3],
    [32, 8, 15, 12, 3],
    [49, 8, 8, 12, 3],
    [59, 8, 6, 12, 3],
    [67, 8, 6, 12, 3],
    [75, 8, 8, 12, 3],
    [85, 8, 13, 12, 3],
    // Row 1
    [0, 38, 7, 18, 4],
    [10, 38, 18, 14, 4],
    [32, 38, 12, 14, 4],
    [49, 38, 6, 14, 4],
    [59, 38, 5, 14, 4],
    [67, 38, 5, 14, 4],
    [75, 38, 7, 14, 4],
    [85, 38, 12, 18, 4],
    // Row 2
    [0, 82, 7, 18, 4],
    [10, 82, 16, 14, 4],
    [32, 82, 13, 14, 4],
    [49, 82, 6, 14, 4],
    [59, 82, 5, 14, 4],
    [67, 82, 5, 14, 4],
    [75, 82, 7, 14, 4],
    [85, 82, 12, 18, 4],
    // Row 3
    [0, 126, 7, 18, 4],
    [10, 126, 19, 14, 4],
    [32, 126, 11, 14, 4],
    [49, 126, 6, 14, 4],
    [59, 126, 5, 14, 4],
    [67, 126, 5, 14, 4],
    [75, 126, 7, 14, 4],
    [85, 126, 12, 18, 4],
    // Row 4
    [0, 170, 7, 18, 4],
    [10, 170, 17, 14, 4],
    [32, 170, 12, 14, 4],
    [49, 170, 6, 14, 4],
    [59, 170, 5, 14, 4],
    [67, 170, 5, 14, 4],
    [75, 170, 7, 14, 4],
    [85, 170, 12, 18, 4],
    // Row 5
    [0, 214, 7, 18, 4],
    [10, 214, 15, 14, 4],
    [32, 214, 14, 14, 4],
    [49, 214, 6, 14, 4],
    [59, 214, 5, 14, 4],
    [67, 214, 5, 14, 4],
    [75, 214, 7, 14, 4],
    [85, 214, 12, 18, 4],
  ],
}

/**
 * Bones for Finance Accounting Table
 */
export const financeAccountingBones: SkeletonResult = {
  name: 'finance-accounting-table',
  viewportWidth: 1200,
  width: 1200,
  height: 340,
  bones: [
    // Header
    [0, 8, 10, 12, 3],
    [12, 8, 25, 12, 3],
    [40, 8, 12, 12, 3],
    [55, 8, 10, 12, 3],
    [68, 8, 12, 12, 3],
    [82, 8, 12, 12, 3],
    // Row 1
    [0, 36, 8, 16, 4],
    [12, 36, 22, 14, 4],
    [40, 36, 10, 14, 4],
    [55, 36, 8, 14, 4],
    [68, 36, 10, 14, 4],
    [82, 36, 8, 16, 4],
    // Row 2
    [0, 76, 8, 16, 4],
    [12, 76, 20, 14, 4],
    [40, 76, 10, 14, 4],
    [55, 76, 8, 14, 4],
    [68, 76, 10, 14, 4],
    [82, 76, 8, 16, 4],
    // Row 3
    [0, 116, 8, 16, 4],
    [12, 116, 24, 14, 4],
    [40, 116, 10, 14, 4],
    [55, 116, 8, 14, 4],
    [68, 116, 10, 14, 4],
    [82, 116, 8, 16, 4],
    // Row 4
    [0, 156, 8, 16, 4],
    [12, 156, 18, 14, 4],
    [40, 156, 10, 14, 4],
    [55, 156, 8, 14, 4],
    [68, 156, 10, 14, 4],
    [82, 156, 8, 16, 4],
    // Row 5
    [0, 196, 8, 16, 4],
    [12, 196, 21, 14, 4],
    [40, 196, 10, 14, 4],
    [55, 196, 8, 14, 4],
    [68, 196, 10, 14, 4],
    [82, 196, 8, 16, 4],
  ],
}

// Register all bones in the boneyard-js global registry
registerBones({
  'executive-kpis': executiveKpiBones,
  'executive-chart': executiveChartBones,
  'executive-alerts': executiveAlertHubBones,
  'inventory-table': inventoryTableBones,
  'finance-accounting-table': financeAccountingBones,
})
