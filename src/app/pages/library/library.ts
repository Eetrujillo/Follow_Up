import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface Folder {
  name: string;
  docs: number;
}

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './library.html',
  styleUrl: './library.css'
})
export class Library {

  folders: Folder[] = [
    { name: 'Desarrollo Frontend',     docs: 12 },
    { name: 'Desarrollo Backend',      docs: 8  },
    { name: 'Bases de Datos',          docs: 5  },
    { name: 'Algoritmos',              docs: 15 },
    { name: 'Diseno UX/UI',            docs: 7  },
    { name: 'DevOps',                  docs: 4  },
    { name: 'Machine Learning',        docs: 9  },
    { name: 'Arquitectura de Software',docs: 6  },
  ];
}