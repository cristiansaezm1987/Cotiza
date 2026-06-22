import 'dotenv/config';
import { extractKeywordsForItems } from './lib/intelligence.js';

extractKeywordsForItems('PLA PARA IMPRESORAS Y MANTENCION', [
    {nombre: 'Bandas de impresión', descripcion: 'PLA-CYAN 1 KILO'}, 
    {nombre: 'Bandas de impresión', descripcion: 'PLA-BLANCO 1 KILO'}, 
    {nombre: 'Bandas de impresión', descripcion: 'PLA-NEGRO 1 KILO'}
]).then(console.log).catch(console.error);
