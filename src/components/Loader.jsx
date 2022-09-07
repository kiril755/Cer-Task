import { Loading } from "notiflix/build/notiflix-loading-aio";

export function startLoader() {
  Loading.dots({
    svgColor: "#ff6b08",
    svgSize: "100px",
  });
}

export function stopLoader() {
  Loading.remove(100);
}
