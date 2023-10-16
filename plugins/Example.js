export default function Example({ file, element }) {
    if (file.endsWith('.jsx') && file === "frontend/src/components/Loader.jsx") {
        return {
            condition: true,
            defaultExport: ({ file, element }) => {
                let node = element.declaration.body.body[1];
                let img = "https://media.bizj.us/view/img/12093761/mdp06464*1200xx1333-1333-334-0.jpg";
                Object.assign(node.argument.children[1].children[3].openingElement.attributes[1].value, {
                    value: img,
                    raw: `"${img}"`,
                });
                element.declaration.body.body[1] = node;
                return {
                    element
                };
            }
        };
    } else {
        return {
            condition: false,
        };
    }
}
