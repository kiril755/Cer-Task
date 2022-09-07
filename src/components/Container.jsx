import React, { useRef, useState } from "react";
import ASN1 from "@lapo/asn1js";
import Notiflix from "notiflix";
import { startLoader, stopLoader } from "./Loader";

const Container = () => {
  const [btnActive, setBtnActive] = useState(false);
  const [activeCert, setActivecert] = useState(false);
  const [name, setName] = useState([]);
  const [moreInfoActive, setMoreInfoActive] = useState(false);

  React.useEffect(() => {
    if (JSON.parse(localStorage.getItem("moreCertInfo")).length > 0) {
      let localCertInfo = JSON.parse(localStorage.getItem("moreCertInfo"));

      setName(localCertInfo.map((el) => el.commonName));
    }
  }, []);

  const btnChange = () => {
    btnActive ? setBtnActive(false) : setBtnActive(true);
    setMoreInfoActive(false);
    setActivecert(false);
  };

  const dragStartHandler = (e) => {
    e.preventDefault();
  };

  const dragLeaveHandler = (e) => {
    e.preventDefault();
  };

  const addCertToLocal = (localMoreInfo) => {
    if (JSON.parse(localStorage.getItem("moreCertInfo"))) {
      localStorage.setItem(
        "moreCertInfo",
        JSON.stringify(
          JSON.parse(localStorage.getItem("moreCertInfo")).concat(localMoreInfo)
        )
      );
    } else {
      localStorage.setItem("moreCertInfo", JSON.stringify([]));
      localStorage.setItem("addedFilesCheck", JSON.stringify([]));
    }
  };

  const onDropHandler = (e) => {
    startLoader();
    e.preventDefault();
    let files = [...e.dataTransfer.files];

    let arrNames = [];

    files.map((file) => {
      if (
        JSON.parse(localStorage.getItem("addedFilesCheck")).includes(file.name)
      ) {
        return Notiflix.Notify.failure("Сертифікат вже додано!");
      }

      if (file.size > 100000) {
        stopLoader();
        return Notiflix.Notify.failure(
          "Неправильна структура конверта сертифіката (очікується SEQUENCE)"
        );
      }

      let fileReader = new FileReader();

      fileReader.readAsBinaryString(file);
      fileReader.onloadend = function () {
        if (!fileReader.result) {
          stopLoader();
          return Notiflix.Notify.failure(
            "Неправильна структура конверта сертифіката (очікується SEQUENCE)"
          );
        }

        if (
          fileReader.result.length > 50
            ? !window.btoa(fileReader.result.slice(0, 50)).includes("gAwIBAgI")
            : !window.btoa(fileReader.result).includes("gAwIBAgI")
        ) {
          stopLoader();
          return Notiflix.Notify.failure(
            "Неправильна структура конверта сертифіката (очікується SEQUENCE)"
          );
        }

        const result = ASN1.decode(fileReader.result);
        if (result.typeName() !== "SEQUENCE") {
          stopLoader();
          return Notiflix.Notify.failure(
            "Неправильна структура конверта сертифіката (очікується SEQUENCE)"
          );
        }
        const tbsCertificate = result.sub[0];
        let moreInfoObj = {
          commonName: "",
          issuerName: "",
          validFrom: tbsCertificate.sub[4].sub[0].content(),
          validTill: tbsCertificate.sub[4].sub[1].content(),
        };
        const objForCommonName = tbsCertificate.sub[5];
        const objForIssuerName = tbsCertificate.sub[3];
        function dataFinding(commonNameObj, issueNameobj) {
          for (const el of commonNameObj) {
            if (el.sub[0].sub[0].content().includes("commonName")) {
              arrNames.push(el.sub[0].sub[1].content());
              moreInfoObj.commonName = el.sub[0].sub[1].content();
            }
          }
          for (const el of issueNameobj) {
            if (el.sub[0].sub[0].content().includes("commonName")) {
              moreInfoObj.issuerName = el.sub[0].sub[1].content();
            }
          }
        }
        dataFinding(objForCommonName.sub, objForIssuerName.sub);
        addCertToLocal(moreInfoObj);
        setName(name.concat(arrNames));
        stopLoader();
        Notiflix.Notify.success("Сертифікат успішно додано!");

        localStorage.setItem(
          "addedFilesCheck",
          JSON.stringify(
            JSON.parse(localStorage.getItem("addedFilesCheck")).concat(
              file.name
            )
          )
        );
      };
    });
  };

  const detailCergInfo = (el) => {
    const localData = JSON.parse(localStorage.getItem("moreCertInfo"));
    setMoreInfoActive(localData[el]);
    setBtnActive(false);
  };

  const deleteCert = () => {
    setName([]);
    setMoreInfoActive(false);
    setActivecert(false);
    localStorage.removeItem("cert");
    localStorage.removeItem("moreCertInfo");
    localStorage.removeItem("addedFilesCheck");

    Notiflix.Notify.warning("Сертифікати видалено");
  };

  addCertToLocal([]);

  return (
    <div className="container">
      <div className="certificate">
        <div className="certificate__main">
          <ul className="certificate__list">
            {name.length > 0 ? (
              name.map((el, i) => (
                <li
                  key={i}
                  className={`certificate__item ${
                    activeCert === i ? "active" : ""
                  }`}
                  value={i}
                  onClick={(e) => {
                    detailCergInfo(i);
                    setActivecert(i);
                  }}
                >
                  <p>{el}</p>
                </li>
              ))
            ) : (
              <li key="empty-name" className="certificate__item empty">
                <p>Сертифікат ще не додано</p>
              </li>
            )}
          </ul>
          <button
            className="btn certificate__btn-add"
            type="button"
            onClick={btnChange}
          >
            {btnActive ? "Скасувати" : "Додати"}
          </button>
          <button
            className="btn certificate__btn-delete"
            type="button"
            onClick={deleteCert}
          >
            Видалити сертифікати
          </button>
        </div>
        {btnActive ? (
          <div
            className="certificate__dnd dnd-active"
            onDragStart={(e) => dragStartHandler(e)}
            onDragLeave={(e) => dragLeaveHandler(e)}
            onDragOver={(e) => dragStartHandler(e)}
            onDrop={(e) => onDropHandler(e)}
          >
            Перетягніть файл сертифіката у поле
          </div>
        ) : (
          <div className="certificate__dnd">
            {moreInfoActive ? (
              <>
                <p className="more-info">
                  Common Name: {moreInfoActive.commonName}
                </p>
                <p className="more-info">
                  Issuer CN: {moreInfoActive.issuerName}
                </p>
                <p className="more-info">
                  Valid From: {moreInfoActive.validFrom}
                </p>
                <p className="more-info">
                  Valid Till: {moreInfoActive.validTill}
                </p>
              </>
            ) : (
              <p>Виберіть сертифікат, щоб переглянути інформацію</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Container;
