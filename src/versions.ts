const versions: Array<[string, string]> = [
  ['Version Control', 'Ввёл простенький version-control'],
  ['Some fixes', 'Чуть пофиксил'],
  [
    'Scroll complete fix',
    'Полностью исправлен scroll\nРаботает корректно при зажатых стрелках влево-вправо, при dragging, при одиночных нажатиях стрелок',
  ],
  ['Modal testing', 'testing'],
  [
    'New changeLog!',
    `
  # ChangeLog

Просто красивый тестовый changelog


> (время разработки не учитывалось, как рабочее)
`,
  ],
  [
    'Grid Great Optimizations',
    `
  # Large optimizations

Полностью переделан data-binding и огранизация layout-а для сетки записи`,
  ],
  [
    'Smart shifting yeah',
    `
  # Smart shifting

Раздвижение ячеек происходит с учётом их продолжительности`,
  ],
];

export default versions;
