import * as _ from "lodash";
import "bootstrap/js/src/tab";
import * as $ from "jquery";
import * as React from "react";
import * as ReactDOM from "react-dom";
import "../../assets/vscode.scss";
import { baz } from "./java.formatter.whitespace";


const code = "class MyClass \{\n\tint a = 0, b = 1, c = 2, d = 3;\n\}";

export const Editor = (props) => {
  const [value, setValue] = React.useState(props.name);

  const handleChange = (event) => {
    setValue(event.target.value);
  };

  const format = (value) => {
    document.getElementById("noter-text-area").readOnly = true;
    setValue("class MyClass \{\n\tint a = 0, b = 1, c = 2, d = 3;\n\}");
  };

  const raw = (value) => {
    document.getElementById("noter-text-area").readOnly = false;
    setValue("class MyClass \{int a = 0,b = 1,c = 2,d = 3;\}");
  };


  return (
    <div id="root">
      <form id="noter-save-form" method="POST">
        <textarea id="noter-text-area" className="md-textarea form-control form-control-lg" rows={15} name="textarea" value={value} onChange={handleChange} />
      </form>
      <div className="row">
        <div className="col-lg-12">
          <button onClick={() => format(value)} id="btnFormat" className="btn btn-primary mr-2 float-right" title="Format Code">Format Code</button>
          <button onClick={() => raw(value)} id="btnRaw" className="btn btn-primary mr-2 float-right" title="Edit Raw Code">Edit Raw Code</button>
        </div>
      </div>
    </div>
  );
};
