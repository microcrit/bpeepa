export default function Example({ file, element }) {
    if (file.endsWith('.jsx')) {
        return {
            condition: true,
            defaultExport: ({ file, element }) => {
                console.log(element);
                const node = element.declaration.body;
                node.body[1].argument.children[1].children[1].openingElement.children[3].attributes[1].src = "https://media.bizj.us/view/img/12093761/mdp06464*1200xx1333-1333-334-0.jpg";
            }
        };
    } else {
        return {
            condition: false,
        };
    }
}