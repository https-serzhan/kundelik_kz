// Демо-данные: копия DB из public/js/data.js. Используется seedCommon и seedUser.
const TEMPLATE = {
  student: {
    name: { kz: "Айдана Серікқызы", ru: "Айдана Сериккызы" },
    group: "ИС-21-3",
    studentId: "210345",
    course: 3,
    faculty: { kz: "Ақпараттық технологиялар факультеті", ru: "Факультет информационных технологий" },
    email: "aidana.s@univer.kz",
    phone: "+7 (701) 234-56-78",
    photo: "АС",
  },

  subjects: [
    { id: "alg", name: { kz: "Алгоритмдер мен деректер құрылымы", ru: "Алгоритмы и структуры данных" }, teacher: { kz: "Бекжан Н.А.", ru: "Бекжан Н.А." }, credits: 5, midterm: 88, final: 92 },
    { id: "db",  name: { kz: "Дерекқорлар", ru: "Базы данных" }, teacher: { kz: "Сапарова Г.К.", ru: "Сапарова Г.К." }, credits: 4, midterm: 76, final: 81 },
    { id: "web", name: { kz: "Веб-технологиялар", ru: "Веб-технологии" }, teacher: { kz: "Омаров Д.Т.", ru: "Омаров Д.Т." }, credits: 4, midterm: 95, final: 97 },
    { id: "os",  name: { kz: "Операциялық жүйелер", ru: "Операционные системы" }, teacher: { kz: "Кенжебек А.М.", ru: "Кенжебек А.М." }, credits: 3, midterm: 64, final: 70 },
    { id: "math", name: { kz: "Дискретті математика", ru: "Дискретная математика" }, teacher: { kz: "Ахметова Л.С.", ru: "Ахметова Л.С." }, credits: 4, midterm: 72, final: 68 },
    { id: "eng", name: { kz: "Кәсіби ағылшын тілі", ru: "Профессиональный английский" }, teacher: { kz: "Smith J.", ru: "Smith J." }, credits: 3, midterm: 90, final: 85 },
  ],

  schedule: [
    { day: 1, time: "09:00–10:30", subject: { kz: "Алгоритмдер", ru: "Алгоритмы" }, room: "А-305", teacher: { kz: "Бекжан Н.А.", ru: "Бекжан Н.А." }, mode: "offline" },
    { day: 1, time: "10:40–12:10", subject: { kz: "Дерекқорлар", ru: "Базы данных" }, room: "А-210", teacher: { kz: "Сапарова Г.К.", ru: "Сапарова Г.К." }, mode: "offline" },
    { day: 1, time: "13:00–14:30", subject: { kz: "Ағылшын тілі", ru: "Английский язык" }, room: "Zoom", teacher: { kz: "Smith J.", ru: "Smith J." }, mode: "online" },
    { day: 2, time: "09:00–10:30", subject: { kz: "Веб-технологиялар", ru: "Веб-технологии" }, room: "Б-112", teacher: { kz: "Омаров Д.Т.", ru: "Омаров Д.Т." }, mode: "offline" },
    { day: 2, time: "10:40–12:10", subject: { kz: "Дискретті математика", ru: "Дискретная математика" }, room: "А-118", teacher: { kz: "Ахметова Л.С.", ru: "Ахметова Л.С." }, mode: "offline" },
    { day: 3, time: "11:00–12:30", subject: { kz: "Операциялық жүйелер", ru: "Операционные системы" }, room: "Teams", teacher: { kz: "Кенжебек А.М.", ru: "Кенжебек А.М." }, mode: "online" },
    { day: 3, time: "13:00–14:30", subject: { kz: "Алгоритмдер (практика)", ru: "Алгоритмы (практика)" }, room: "А-305", teacher: { kz: "Бекжан Н.А.", ru: "Бекжан Н.А." }, mode: "offline" },
    { day: 4, time: "09:00–10:30", subject: { kz: "Дерекқорлар (зертхана)", ru: "Базы данных (лаб.)" }, room: "А-210", teacher: { kz: "Сапарова Г.К.", ru: "Сапарова Г.К." }, mode: "offline" },
    { day: 4, time: "10:40–12:10", subject: { kz: "Веб-технологиялар", ru: "Веб-технологии" }, room: "Б-112", teacher: { kz: "Омаров Д.Т.", ru: "Омаров Д.Т." }, mode: "offline" },
    { day: 5, time: "11:00–12:30", subject: { kz: "Дискретті математика", ru: "Дискретная математика" }, room: "А-118", teacher: { kz: "Ахметова Л.С.", ru: "Ахметова Л.С." }, mode: "offline" },
    { day: 5, time: "13:00–14:30", subject: { kz: "Ағылшын тілі", ru: "Английский язык" }, room: "Zoom", teacher: { kz: "Smith J.", ru: "Smith J." }, mode: "online" },
    { day: 6, time: "10:00–11:30", subject: { kz: "Операциялық жүйелер (практика)", ru: "Операционные системы (практика)" }, room: "А-401", teacher: { kz: "Кенжебек А.М.", ru: "Кенжебек А.М." }, mode: "offline" },
  ],

  homework: [
    { id: "hw1", subject: { kz: "Алгоритмдер", ru: "Алгоритмы" }, title: { kz: "№4 зертханалық: екілік ағаштар", ru: "Лаб. №4: бинарные деревья" }, deadline: "2026-06-02", status: "pending" },
    { id: "hw2", subject: { kz: "Дерекқорлар", ru: "Базы данных" }, title: { kz: "SQL сұраныстар жинағы", ru: "Сборник SQL-запросов" }, deadline: "2026-05-30", status: "pending" },
    { id: "hw3", subject: { kz: "Веб-технологиялар", ru: "Веб-технологии" }, title: { kz: "Жеке портфолио сайты", ru: "Сайт-портфолио" }, deadline: "2026-06-05", status: "pending" },
    { id: "hw4", subject: { kz: "Ағылшын тілі", ru: "Английский язык" }, title: { kz: "Эссе: My future profession", ru: "Эссе: My future profession" }, deadline: "2026-05-29", status: "submitted" },
    { id: "hw5", subject: { kz: "Дискретті математика", ru: "Дискретная математика" }, title: { kz: "Граф теориясы есептері", ru: "Задачи теории графов" }, deadline: "2026-06-08", status: "pending" },
  ],

  attendance: [
    { subject: { kz: "Алгоритмдер", ru: "Алгоритмы" }, total: 24, attended: 23 },
    { subject: { kz: "Дерекқорлар", ru: "Базы данных" }, total: 20, attended: 18 },
    { subject: { kz: "Веб-технологиялар", ru: "Веб-технологии" }, total: 20, attended: 20 },
    { subject: { kz: "Операциялық жүйелер", ru: "Операционные системы" }, total: 16, attended: 12 },
    { subject: { kz: "Дискретті математика", ru: "Дискретная математика" }, total: 20, attended: 17 },
    { subject: { kz: "Ағылшын тілі", ru: "Английский язык" }, total: 18, attended: 16 },
  ],

  chats: [
    {
      id: "teacher", type: "teacher", name: { kz: "Бекжан Н.А. (Алгоритмдер)", ru: "Бекжан Н.А. (Алгоритмы)" },
      messages: [
        { from: "them", author: { kz: "Бекжан Н.А.", ru: "Бекжан Н.А." }, text: { kz: "Сәлеметсіз бе! №4 зертханалық жұмысты тапсырдыңыз ба?", ru: "Здравствуйте! Сдали лабораторную №4?" }, time: "09:14" },
        { from: "me", author: { kz: "Сіз", ru: "Вы" }, text: { kz: "Әлі емес, бүгін кешке жіберемін.", ru: "Ещё нет, отправлю сегодня вечером." }, time: "09:20" },
      ],
    },
    {
      id: "group", type: "group", name: { kz: "ИС-21-3 топ чаты", ru: "Групповой чат ИС-21-3" },
      messages: [
        { from: "them", author: { kz: "Дамир", ru: "Дамир" }, text: { kz: "Ертеңгі лекция онлайн ма?", ru: "Завтра лекция онлайн?" }, time: "18:02" },
        { from: "them", author: { kz: "Мадина", ru: "Мадина" }, text: { kz: "Иә, Zoom-да.", ru: "Да, в Zoom." }, time: "18:05" },
      ],
    },
    {
      id: "admin", type: "admin", name: { kz: "Әкімшілік хабарламалары", ru: "Сообщения администрации" },
      messages: [
        { from: "them", author: { kz: "Деканат", ru: "Деканат" }, text: { kz: "Стипендия 1 маусымда есепшотқа түседі.", ru: "Стипендия поступит на счёт 1 июня." }, time: "12:00" },
      ],
    },
  ],

  files: [
    { id: "f1", name: "Lecture_07_Trees.pdf", type: "pdf", subject: { kz: "Алгоритмдер", ru: "Алгоритмы" }, size: "2.4 MB", date: "2026-05-20" },
    { id: "f2", name: "SQL_Joins.pptx", type: "ppt", subject: { kz: "Дерекқорлар", ru: "Базы данных" }, size: "5.1 MB", date: "2026-05-18" },
    { id: "f3", name: "CSS_Grid_Flexbox.pdf", type: "pdf", subject: { kz: "Веб-технологиялар", ru: "Веб-технологии" }, size: "1.8 MB", date: "2026-05-22" },
    { id: "f4", name: "Practice_Processes.docx", type: "doc", subject: { kz: "Операциялық жүйелер", ru: "Операционные системы" }, size: "640 KB", date: "2026-05-15" },
    { id: "f5", name: "Graph_Theory_Notes.pdf", type: "pdf", subject: { kz: "Дискретті математика", ru: "Дискретная математика" }, size: "3.0 MB", date: "2026-05-19" },
    { id: "f6", name: "Presentation_Web_APIs.pptx", type: "ppt", subject: { kz: "Веб-технологиялар", ru: "Веб-технологии" }, size: "4.2 MB", date: "2026-05-24" },
  ],

  exams: [
    { subject: { kz: "Алгоритмдер мен деректер құрылымы", ru: "Алгоритмы и структуры данных" }, date: "2026-06-10", time: "09:00", room: "А-305", result: null },
    { subject: { kz: "Дерекқорлар", ru: "Базы данных" }, date: "2026-06-13", time: "11:00", room: "А-210", result: null },
    { subject: { kz: "Веб-технологиялар", ru: "Веб-технологии" }, date: "2026-06-16", time: "09:00", room: "Б-112", result: null },
    { subject: { kz: "Дискретті математика", ru: "Дискретная математика" }, date: "2026-05-26", time: "10:00", room: "А-118", result: 84 },
    { subject: { kz: "Кәсіби ағылшын тілі", ru: "Профессиональный английский" }, date: "2026-05-24", time: "13:00", room: "Zoom", result: 88 },
  ],

  news: [
    { id: "n1", title: { kz: "Жазғы сессия кестесі жарияланды", ru: "Опубликовано расписание летней сессии" }, text: { kz: "Емтихандар 10 маусымда басталады. Толық кестені «Емтихан» бөлімінен қараңыз.", ru: "Экзамены начинаются 10 июня. Полное расписание — в разделе «Экзамены»." }, date: "2026-05-26", tag: { kz: "Оқу", ru: "Учёба" } },
    { id: "n2", title: { kz: "IT-хакатон 2026", ru: "IT-хакатон 2026" }, text: { kz: "5 маусымда университетте 24 сағаттық хакатон өтеді. Тіркелу ашық.", ru: "5 июня в университете пройдёт 24-часовой хакатон. Регистрация открыта." }, date: "2026-05-24", tag: { kz: "Іс-шара", ru: "Событие" } },
    { id: "n3", title: { kz: "Кітапхана жұмыс уақыты ұзартылды", ru: "Продлены часы работы библиотеки" }, text: { kz: "Сессия кезінде кітапхана 22:00-ге дейін ашық.", ru: "На время сессии библиотека работает до 22:00." }, date: "2026-05-22", tag: { kz: "Хабарлама", ru: "Объявление" } },
  ],

  announcements: [
    { id: "a1", text: { kz: "27 мамырда 14:00-де топ старостасының жиыны.", ru: "27 мая в 14:00 собрание старост групп." }, date: "2026-05-27", type: "info" },
    { id: "a2", text: { kz: "Дерекқорлар бойынша ДЗ мерзімі — 30 мамыр!", ru: "Дедлайн ДЗ по базам данных — 30 мая!" }, date: "2026-05-28", type: "warning" },
  ],
};
module.exports = TEMPLATE;
