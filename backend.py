from flask import Flask, request, jsonify
import csv
import os

app = Flask(__name__)
CSV_FILE = 'Clientes/clientes.csv'

@app.route('/guardar-cliente', methods=['POST'])
def guardar_cliente():
    data = request.get_json()
    campos = [
        data.get('nombre', ''),
        data.get('telefono', ''),
        data.get('correo', ''),
        data.get('direccion', ''),
        data.get('marca', ''),
        data.get('modelo', ''),
        data.get('año', ''),
        data.get('patente', ''),
        data.get('kilometraje', '')
    ]
    # Escribir en el archivo CSV
    with open(CSV_FILE, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f, quoting=csv.QUOTE_ALL)
        writer.writerow(campos)
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
