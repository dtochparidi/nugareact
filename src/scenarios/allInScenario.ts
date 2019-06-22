import addAppsScenario from './addAppsScenario';
import changePersonsScenario from './changePersonsScenario';
import removeAppsScenario from './removeAppsScenario';
import lazyTaskManager from '@levabala/lazytask/build/dist/LazyTaskManager';
import { LazyTask } from '@levabala/lazytask/build/dist';

function random(to: number, from: number = 0) {
  return Math.floor(Math.random() * (to - from)) + from;
}

export default function allInScenario() {
  function a() {
    addAppsScenario(random(5, 0));
    setTimeout(
      () => lazyTaskManager.addTask(new LazyTask({func: a})),
      random(300, 900),
    );
  }

  function b() {
    removeAppsScenario(random(0.2, 0.05));
    setTimeout(
      () => lazyTaskManager.addTask(new LazyTask({func: b})),
      random(1000, 2500),
    );
  }

  function c() {
    changePersonsScenario(random(0.1, 0.01));
    setTimeout(
      () => lazyTaskManager.addTask(new LazyTask({func: c})),
      random(500, 1500),
    );
  }

  a();
  b();
  c();
}
