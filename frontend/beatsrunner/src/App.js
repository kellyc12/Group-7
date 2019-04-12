import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import './bootstrap.min.css';

import Container from 'react-bootstrap/Container';
import Card from 'react-bootstrap/Card';
import FormControl from 'react-bootstrap/FormControl';
import InputGroup from 'react-bootstrap/InputGroup';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

class App extends Component {
  render() {
    return (
      <Container fluid={true} style={{backgroundColor: "black"}} className="py-3">
        <Card style={{backgroundColor: "#FFF0F5"}}>
          <Card.Title>
            <center className="mt-3"><h3>RunningBeats</h3></center>
          </Card.Title>

          <Card.Body>
            <Form>
  <Form.Group controlId="formBasicEmail">
    <Form.Label>Username</Form.Label>
    <Form.Control type="Username" placeholder="Enter your username" />
    
  </Form.Group>

  <Form.Group controlId="formBasicPassword">
    <Form.Label>Password</Form.Label>
    <Form.Control type="password" placeholder="Password" />
  </Form.Group>
  <Form.Text className="text-muted">
      Forgot your username or password? Tough luck.
    </Form.Text>
  <Button variant="dark" type="submit">
    Log In
  </Button>
</Form>
          </Card.Body>
        </Card>
      </Container>
    );
  }
}

export default App;
