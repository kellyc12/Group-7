import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import './bootstrap.min.css';

import Container from 'react-bootstrap/Container';
import Card from 'react-bootstrap/Card';
import FormControl from 'react-bootstrap/FormControl';
import InputGroup from 'react-bootstrap/InputGroup';
import Button from 'react-bootstrap/Button';

class App extends Component {
  render() {
    return (
      <Container fluid={true} style={{backgroundColor: "black"}} className="py-3">
        <Card style={{backgroundColor: "#1ED761"}}>
          <Card.Title>
            <center className="mt-3"><h3>BeatsRunner</h3></center>
          </Card.Title>

          <Card.Body>
            <InputGroup className="mb-3">
              <InputGroup.Prepend>
                <InputGroup.Text id="basic-addon1">Song Name</InputGroup.Text>
              </InputGroup.Prepend>
              <FormControl
                placeholder="Please input a song name"
                aria-label="Username"
                aria-describedby="basic-addon1"
              />
            </InputGroup>
            <center>
              <Button>Pair!</Button>
            </center>
          </Card.Body>
        </Card>
      </Container>
    );
  }
}

export default App;
