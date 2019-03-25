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
  [
    'Update1.1',
    `
# Update
> v1.1
  `,
  ],
  [
    'Update1.2#3',
    `
# Кардинальное улучшение производительности
Теперь все времязатратные процессы добавлются в очередь исполнения задач.
Когда система понимает, что нагрузка на устройство приемлимая, она исполняет столько задач, сколько возможно исполнить без лагов

> Система управления задач вынесена в отдельный репозиторий https://github.com/levabala/lazytask
  `,
  ],
];

export default versions;
